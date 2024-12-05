const { Kafka } = require("kafkajs");
const config = require("./config");
const { kafkaBroker } = require("./config");

class NodeManager {
  constructor() {
    this.kafka = new Kafka({
      clientId: "node-manager",
      brokers: kafkaBroker.split(","),
    });
  }

  async registerNode(nodeId) {
    console.log(`Node ${nodeId} registered with Kafka.`);
  }

  async subscribeToTopic(nodeId, topic) {
    try {
      const consumer = this.kafka.consumer({ groupId: "pubsub-system-group" });

      await consumer.connect();

      await consumer.subscribe({ topic });

      await consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const parsedMessage = JSON.parse(message.value.toString());
          console.log(
            `Node ${nodeId} received message on topic '${topic}': ${parsedMessage}`
          );
        },
      });

      console.log(`Node ${nodeId} successfully subscribed to topic '${topic}'`);
    } catch (error) {
      console.error(`Node ${nodeId} subscription failed:`, error);
    }
  }

  async manageNodes(nodes) {
    console.log("Managing nodes...");
    for (let node of nodes) {
      console.log(`Initializing node ${node.nodeId}...`);
      await this.registerNode(node.nodeId);
      console.log(`Node ${node.nodeId} registered successfully.`);
      for (const topic of node.topics) {
        console.log(`Subscribing node ${node.nodeId} to topic '${topic}'...`);
        await this.subscribeToTopic(node.nodeId, topic);
        console.log(`Node ${node.nodeId} subscribed to topic '${topic}'`);
      }
    }
  }
}

module.exports = new NodeManager();
