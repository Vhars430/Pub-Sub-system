const { Kafka } = require("kafkajs");
const config = require("./config");

class NodeManager {
  constructor() {
    this.kafka = new Kafka({
      clientId: "node-manager",
      brokers: kafkaBroker.split(","),
    });
  }

  // Register nodes using Kafka protocol (Not via HTTP)
  async registerNode(nodeId) {
    // This would be useful if you need to add custom logic for node registration.
    // In Kafka, nodes are just consumers or producers, so registration is implied when you connect them.
    console.log(`Node ${nodeId} registered with Kafka.`);
  }

  // Subscribe node to a Kafka topic using kafkajs
  async subscribeToTopic(nodeId, topic) {
    try {
      const consumer = this.kafka.consumer({ groupId: "pubsub-system-group" });

      // Connect consumer to Kafka broker
      await consumer.connect();

      // Subscribe to the specified topic
      await consumer.subscribe({ topic });

      // Process messages for the subscribed topic
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

  // Manage nodes: Register and subscribe to topics
  async manageNodes(nodes) {
    console.log("Managing nodes...");
    for (let node of nodes) {
      console.log(`Initializing node ${node.nodeId}...`);
      // Register each node (this is handled implicitly by connecting them to Kafka)
      await this.registerNode(node.nodeId);
      console.log(`Node ${node.nodeId} registered successfully.`);
      // Subscribe each node to its specific topics
      for (const topic of node.topics) {
        console.log(`Subscribing node ${node.nodeId} to topic '${topic}'...`);
        await this.subscribeToTopic(node.nodeId, topic);
        console.log(`Node ${node.nodeId} subscribed to topic '${topic}'`);
      }
    }
  }
}

module.exports = new NodeManager();
