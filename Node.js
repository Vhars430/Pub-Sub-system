const { Kafka } = require("kafkajs");
const GossipProtocol = require("./GossipProtocol");
const LeaderElection = require("./LeaderElection");
const VirtualRing = require("./VirtualRing");
const { kafkaBroker } = require("./config");

class Node {
  constructor(
    nodeId,
    kafkaBroker,
    topic,
    groupId = "pubsub-system-group",
    nodes
  ) {
    this.nodeId = nodeId;

    this.kafka = new Kafka({
      clientId: `node-${nodeId}`,
      brokers: kafkaBroker.split(","),
      retry: {
        initialRetryTime: 100,
        retries: 5,
      },
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId });
    this.topic = topic;
    this.virtualRing = new VirtualRing(nodeId, 5); // Example of 5 nodes
    this.gossip = new GossipProtocol(this);
    this.neighbors = [];
    this.virtualRing.setupRing();
    this.updateNeighbors();
    this.leader = null; // Current leader (null if none)
    this.isAlive = true; // Flag to simulate node crash (alive or crashed)
    this.inElection = false; // Flag to check if the node is participating in the election
    this.leaderElection = new LeaderElection(this); // LeaderElection instance
    this.nodes = nodes;
  }

  setNodes(nodesArray) {
    this.nodes = nodesArray; // Set the list of all nodes to this.nodes
  }

  // Get active nodes
  getActiveNodes() {
    // Ensure this.nodes is defined before calling filter
    if (!this.nodes) {
      console.log("Error: Nodes array is not defined.");
      return [];
    }
    return this.nodes.filter(
      (node) => node.isAlive && node.nodeId !== this.nodeId
    );
  }

  updateNeighbors() {
    this.neighbors = this.virtualRing.getNeighbors();
  }

  getNextNode() {
    // Ensure that nodes are properly initialized
    if (!this.nodes || this.nodes.length === 0) {
      console.error(`Node ${this.nodeId}: No nodes initialized.`);
      return null; // or handle as needed
    }

    // Get the next node ID in the list (in circular fashion)
    const nextNodeIndex = this.nodeId % this.nodes.length; // Wrap around if necessary
    const nextNode = this.nodes[nextNodeIndex];

    if (!nextNode || nextNode.nodeId === this.nodeId) {
      console.error(
        `Node ${this.nodeId}: Next node is not valid or is the same as current node.`
      );
      return null; // or handle as needed
    }

    return nextNode; // Return the next node in the list
  }

  async publishMessage(message) {
    if (!this.topic) {
      await createTopicIfNotExists(this, this.topic);
    }
    try {
      await this.producer.connect();
      //console.log(`Node ${this.nodeId} publishing message:`, message);

      await this.producer.send({
        topic: this.topic,
        messages: [{ value: JSON.stringify(message) }],
      });
    } catch (error) {
      console.error(
        `Node ${this.nodeId}: Error publishing message to topic ${this.topic}:`,
        error
      );
      throw error; // Rethrow the error after logging it
    } finally {
      // Disconnect the producer after sending the message
      await this.producer.disconnect();
    }
  }

  async startListening() {
    try {
      // Create topic first
      await createTopicIfNotExists(this, this.topic);

      // Connect consumer
      await this.consumer.connect();

      // Subscribe to topic
      await this.consumer.subscribe({ topic: this.topic });

      // Start consumer
      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const parsedMessage = JSON.parse(message.value.toString());
          if (
            parsedMessage.type === "GOSSIP" &&
            parsedMessage.targetId === this.nodeId
          ) {
            this.handleGossipMessage(parsedMessage.payload);
          }
        },
      });

      // Start gossip protocol
      this.gossip.start();
      console.log(`Node ${this.nodeId} started gossip protocol`);
    } catch (error) {
      console.error(`Error starting node ${this.nodeId}:`, error);
      throw error;
    }
  }

  handleGossipMessage(gossipMessage) {
    if (gossipMessage.sourceId !== this.nodeId) {
      this.gossip.mergeState(gossipMessage.state);
    }
  }

  // Add method to update gossip state
  updateGossipState(key, value) {
    this.gossip.updateState(key, value);
  }

  crash() {
    console.log(`Node ${this.nodeId} has crashed.`);
    this.isAlive = false;
    this.handleNodeCrash(); // Handle leader crash when this node crashes
  }

  // Simulate node revival
  revive(failedNodeId) {
    console.log(`Node ${this.nodeId} has revived.`);
    this.isAlive = true;
    this.checkLeaderStatus(failedNodeId);
  }

  // Handle leader crash and start election if needed
  handleNodeCrash() {
    console.log(`Node ${this.nodeId}: Detected node crash.`);
    if (!this.leader && this.isAlive) {
      console.log(`Node ${this.nodeId}: No leader set, triggering election.`);
      this.inElection = true;
      this.leaderElection.startElection();
    }

    // If this node is not the leader, and it is alive, start the election
    if (
      this.leader &&
      this.nodeId !== this.leader.nodeId &&
      this.isAlive &&
      !this.inElection
    ) {
      console.log(
        `Node ${this.nodeId}: Initiating election since the leader node is down.`
      );
      this.inElection = true;
      this.leaderElection.startElection();
    }
  }

  checkLeaderStatus(failedNodeId) {
    if (!this.leader) {
      console.log(`Node ${this.nodeId}: No leader set, triggering election.`);
      this.inElection = true;
      this.leaderElection.startElection();
    }
    if (this.leader && !this.leader.isAlive && !this.inElection) {
      console.log(`Node ${this.nodeId}: Leader is down, triggering election.`);
      this.inElection = true;
      this.leaderElection.startElection();
    }
    if (this.leader && this.leader.nodeId !== null) {
      // If the revived node's nodeId is greater than the leader's nodeId, trigger an election
      if (this.isAlive && !this.inElection) {
        console.log(
          `Node ${this.nodeId}: triggering election to have latest information.`
        );
        this.inElection = true;
        this.leaderElection.startElection();
      }
    } else {
      console.log(
        `Node ${this.nodeId}: Leader's nodeId is null, triggering election.`
      );
      this.inElection = true;
      this.leaderElection.startElection();
    }
  }

  // Set the leader for this node
  setLeader(leaderNode) {
    this.leader = leaderNode;
    this.inElection = false; // Reset election flag after setting a new leader
    console.log(
      `Node ${this.nodeId} has set Node ${leaderNode.nodeId} as the leader.`
    );
  }
}

async function createTopicIfNotExists(node, topic) {
  const admin = node.kafka.admin();
  await admin.connect();

  try {
    const topics = await admin.listTopics();
    if (!topics.includes(topic)) {
      await admin.createTopics({
        topics: [
          {
            topic,
            numPartitions: 3,
            replicationFactor: 3,
          },
        ],
      });
      console.log(`Topic ${topic} created successfully`);
    }
  } finally {
    await admin.disconnect();
  }
}

module.exports = Node;
