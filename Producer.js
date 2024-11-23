const { Kafka } = require("kafkajs");

class Node {
  constructor(nodeId, kafkaBroker) {
    this.nodeId = nodeId;
    this.kafka = new Kafka({
      clientId: `node-${nodeId}`,
      brokers: [kafkaBroker], // Change to '127.0.0.1:9092'
    });
    this.producer = this.kafka.producer();
  }

  async publishMessage(topic, message) {
    await this.producer.connect();
    console.log(
      `Node ${this.nodeId} publishing message on topic '${topic}':`,
      message
    );
    await this.producer.send({
      topic: topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    await this.producer.disconnect();
  }
}

// Usage example
const node1 = new Node(1, "kafka:9093"); // Update here
node1.publishMessage("topicA", { message: "Hello from Node 1" });
