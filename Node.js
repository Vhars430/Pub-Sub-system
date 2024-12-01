const { Kafka } = require('kafkajs');
const GossipProtocol = require('./GossipProtocol');
const LeaderElection = require('./LeaderElection');
const VirtualRing = require("./VirtualRing");
class Node {
  constructor(nodeId, kafkaBroker, topic, groupId = "pubsub-system-group", nodes) {
    this.nodeId = nodeId;
    
    this.kafka = new Kafka({
      clientId: `node-${nodeId}`,
      brokers: [kafkaBroker],
      retry: {
        initialRetryTime: 100,
        retries: 5,
      },
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId });
    this.topic = "initTopic";
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
      console.log('Error: Nodes array is not defined.');
      return [];
    }
    return this.nodes.filter(node => node.isAlive && node.nodeId !== this.nodeId);
  }

  updateNeighbors() {
    this.neighbors = this.virtualRing.getNeighbors();
  }



  

  // getActiveNodes() {
  //   return this.nodes.filter(node => node.isAlive && node.nodeId !== this.nodeId);
  // }
  getNextNode() {
    const nextNodeId = this.nodeId + 1;
    return new Node(nextNodeId); // Return the next node as an example
  }  

  // async publishMessage(message) {
  //   await this.producer.connect();
  //   console.log(`Node ${this.nodeId} publishing message:`, message);
  //   await this.producer.send({
  //     topic: this.topic,
  //     messages: [{ value: JSON.stringify(message) }],
  //   });
  //   await this.producer.disconnect();
  // }
  async publishMessage(message) {
    // Ensure that topic is valid before sending
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
      console.error(`Node ${this.nodeId}: Error publishing message to topic ${this.topic}:`, error);
      throw error;  // Rethrow the error after logging it
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
    this.handleLeaderCrash(); // Handle leader crash when this node crashes
  }

  // Simulate node revival
  revive() {
    console.log(`Node ${this.nodeId} has revived.`);
    this.isAlive = true;
  }

  // Handle leader crash and start election if needed
  handleLeaderCrash() {
    console.log(`Node ${this.nodeId}: Detected leader crash.`);
    
    // If this node is not the leader, and it is alive, start the election
    if (this.nodeId !== this.leader.nodeId && this.isAlive && !this.inElection) {
      console.log(`Node ${this.nodeId}: Initiating election since the leader node is down.`);
      this.inElection = true;
      this.leaderElection.startElection();
    }
  }

  
  // Set the leader for this node
  setLeader(leaderNode) {
    this.leader = leaderNode;
    this.inElection = false; // Reset election flag after setting a new leader
    console.log(`Node ${this.nodeId} has set Node ${leaderNode.nodeId} as the leader.`);
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
            numPartitions: 1,
            replicationFactor: 1,
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
