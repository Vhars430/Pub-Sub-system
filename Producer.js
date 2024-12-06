const { Kafka } = require("kafkajs");
const { kafkaBroker } = require("./config");

class Node {
  constructor(nodeId) {
    this.nodeId = nodeId;
    this.kafka = new Kafka({
      clientId: `node-${nodeId}`,
      brokers: kafkaBroker.split(","),
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

const node1 = new Node(1);
node1.publishMessage("topicA", { message: "Hello from Node 1" });
