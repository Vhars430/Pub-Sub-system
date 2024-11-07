const { Kafka } = require('kafkajs');

class Node {
  constructor(nodeId, kafkaBroker, topic) {
    this.nodeId = nodeId;
    this.kafka = new Kafka({
      clientId: `node-${nodeId}`,
      brokers: [kafkaBroker]  // Direct broker configuration
    });
    this.consumer = this.kafka.consumer({ groupId: `group-${nodeId}` });
    this.topic = topic;
  }

  async startListening() {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic });
    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log(`Node ${this.nodeId} received message on topic '${topic}': ${message.value.toString()}`);
      }
    });
  }
}

// Usage example
const node1 = new Node(1, 'localhost:9092', 'topicA');
node1.startListening();
