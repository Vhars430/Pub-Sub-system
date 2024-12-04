const { Kafka } = require("kafkajs");
const { kafkaBroker } = require("./config");

class Node {
  constructor(nodeId, topic) {
    this.nodeId = nodeId;
    this.kafka = new Kafka({
      clientId: `node-${nodeId}`,
      brokers: kafkaBroker.split(","),
    });
    this.consumer = this.kafka.consumer({ groupId: "pubsub-system-group" });
    this.topic = topic;
  }

  async startListening() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic });
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log(
          `Node ${
            this.nodeId
          } received message on topic '${topic}': ${message.value.toString()}`
        );
      },
    });
  }
}

// Usage example
const node1 = new Node(1, "topicA"); // Update here
node1.startListening();
