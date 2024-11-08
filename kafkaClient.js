const { Kafka } = require("kafkajs");
const config = require("./config");

// Create a new Kafka client
const kafka = new Kafka({
  clientId: "pubsub-system",
  brokers: [config.kafkaBroker],
});

// Create producer and consumer
const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "pubsub-system-group" });

async function connect() {
  try {
    // Connecting producer and consumer
    console.log("producer: ", producer);
    await producer.connect();
    console.log("Producer connected");
    await consumer.connect();
    console.log("Consumer connected");
  } catch (error) {
    console.error("Error connecting to Kafka:", error);
    process.exit(1); // Exit process if Kafka connection fails
  }
}

// Export producer, consumer, and connect function
module.exports = { producer, consumer, connect };
