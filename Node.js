const { Kafka } = require("kafkajs");
const GossipProtocol = require("./GossipProtocol");
const VirtualRing = require("./VirtualRing");

class Node {
  constructor(nodeId, kafkaBroker, topic, groupId = "pubsub-system-group") {
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
    this.topic = topic;
    this.virtualRing = new VirtualRing(nodeId, 5); // Example of 5 nodes
    this.gossip = new GossipProtocol(this);
    this.neighbors = [];
    this.virtualRing.setupRing(); // Set up the initial ring
    this.updateNeighbors(); // Set neighbors initially
  }

  // Add a method to update neighbors from the virtual ring
  updateNeighbors() {
    this.neighbors = this.virtualRing.getNeighbors();
  }

  async publishMessage(message) {
    await this.producer.connect();
    // console.log(`Node ${this.nodeId} publishing message:`, message);
    await this.producer.send({
      topic: this.topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    await this.producer.disconnect();
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
