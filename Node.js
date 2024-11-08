const { Kafka } = require('kafkajs');

class Node {
  constructor(nodeId, kafkaBroker, topic) {
    this.nodeId = nodeId;
    this.kafka = new Kafka({
      clientId: `node-${nodeId}`,
      brokers: [kafkaBroker],
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: `group-${nodeId}` });
    this.topic = topic;
    this.virtualRing = new (require('./VirtualRing'))(nodeId, 5); // Example of 5 nodes
  }

  async publishMessage(message) {
    await this.producer.connect();
    console.log(`Node ${this.nodeId} publishing message:`, message);
    await this.producer.send({
      topic: this.topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    await this.producer.disconnect();
  }

  async startListening() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic });
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log(`Node ${this.nodeId} received message:`, message.value.toString());
      },
    });
  }
}

module.exports = Node;
