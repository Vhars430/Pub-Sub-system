const { Kafka } = require("kafkajs");
const GossipProtocol = require("./GossipProtocol");
const LeaderElection = require("./LeaderElection");
const VirtualRing = require("./VirtualRing");
const { kafkaBroker } = require("./config");

class Node {
  constructor(nodeId, topic, groupId = "pubsub-system-group", nodes) {
    this.nodeId = nodeId;
    
    this.kafka = new Kafka({
      clientId: `node-${nodeId}`,
      brokers: kafkaBroker.split(","),
      retry: {
        initialRetryTime: 10000,
        retries: 3,
      },
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId });
    this.topic = topic;
    this.virtualRing = new VirtualRing(nodeId, 5);
    this.gossip = new GossipProtocol(this);
    this.neighbors = [];
    this.virtualRing.setupRing();
    this.updateNeighbors();
    this.leader = null; 
    this.isAlive = true; 
    this.inElection = false;
    this.leaderElection = new LeaderElection(this);
    this.nodes = nodes;
    
  }

  setNodes(nodesArray) {
    this.nodes = nodesArray;
  }

  getActiveNodes() {
    if (!this.nodes) {
      console.log('Error: Nodes array is not defined.');
      return [];
    }
    return this.nodes.filter(node => node.isAlive && node.nodeId !== this.nodeId);
  }

  updateNeighbors() {
    this.neighbors = this.virtualRing.getNeighbors();
  }

  getNextNode() {
    if (!this.nodes || this.nodes.length === 0) {
      console.error(`Node ${this.nodeId}: No nodes initialized.`);
      return null;
    }
  
    const nextNodeIndex = (this.nodeId % this.nodes.length);
    const nextNode = this.nodes[nextNodeIndex];
  
    if (!nextNode || nextNode.nodeId === this.nodeId) {
      console.error(`Node ${this.nodeId}: Next node is not valid or is the same as current node.`);
      return null;
    }
  
    return nextNode;
  }
  
  async publishMessage(message) {
    if (!this.topic) {
      await createTopicIfNotExists(this, this.topic);
    }
    try {
      await this.producer.connect();


      await this.producer.send({
        topic: this.topic,
        messages: [{ value: JSON.stringify(message) }],
      });
    } catch (error) {
      console.error(`Node ${this.nodeId}: Error publishing message to topic ${this.topic}:`, error);
      throw error;
    } finally {
      await this.producer.disconnect();
    }
  }
  
  async startListening() {
    try {
      await createTopicIfNotExists(this, this.topic);
      
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

  updateGossipState(key, value) {
    this.gossip.updateState(key, value);
  }

  handleNodeCrash() {

    if (this.isAlive && !this.inElection) {
        if (!this.leader || !this.leader.isAlive) {
            console.log(`Node ${this.nodeId}: Leader is down or no leader set, triggering election.`);
            this.inElection = true;
            this.leaderElection.startElection();
        }
    }

    if (this.isAlive && this.leader && this.nodeId !== this.leader.nodeId && !this.inElection) {
        console.log(`Node ${this.nodeId}: Leader crashed, initiating election.`);
        this.inElection = true;
        this.leaderElection.startElection();
    }
  }
  crash() {
    console.log(`Node ${this.nodeId} has crashed.`);
    this.isAlive = false;
    this.inElection = false;

    this.handleNodeCrash(); 
  }

  revive(failedNodeId) {
  console.log(`Node ${this.nodeId} has revived.`);
  this.isAlive = true;



  this.checkLeaderStatus();
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

  if (this.leader && this.leader.nodeId !== null && this.isAlive && !this.inElection) {
      if (this.nodeId > this.leader.nodeId) {
          console.log(`Node ${this.nodeId}: Node's id is greater than the leader's, triggering election.`);
          this.inElection = true;
          this.leaderElection.startElection();
      }
  }
}
  
setLeader(leaderNode) {
    this.leader = leaderNode;
    this.inElection = false;
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
