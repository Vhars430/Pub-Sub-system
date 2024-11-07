const { Kafka } = require('kafkajs');

class Node {
  constructor(nodeId, kafkaBroker) {
    this.nodeId = nodeId;
    this.kafka = new Kafka({
      clientId: `node-${nodeId}`,
      brokers: [kafkaBroker]  // Direct broker configuration
    });
    this.producer = this.kafka.producer();
  }

  async publishMessage(topic, message) {
    await this.producer.connect();
    console.log(`Node ${this.nodeId} publishing message on topic '${topic}':`, message);
    await this.producer.send({
      topic: topic,
      messages: [{ value: JSON.stringify(message) }],
    });
    await this.producer.disconnect();
  }
}

// Usage example
const node1 = new Node(1, 'localhost:9092');  // Using localhost as broker
node1.publishMessage('topicA', { message: 'Hello from Node 1' });
