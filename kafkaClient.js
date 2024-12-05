const { Kafka } = require("kafkajs");
const config = require("./config");
const { kafkaBroker } = require("./config");

const kafka = new Kafka({
  clientId: "pubsub-system",
  brokers: kafkaBroker.split(","),
});

const producer = kafka.producer();
const consumer = kafka.consumer({ groupId: "pubsub-system-group" });

async function connect() {
  try {
    console.log("producer: ", producer);
    await producer.connect();
    console.log("Producer connected");
    await consumer.connect();
    console.log("Consumer connected");
  } catch (error) {
    console.error("Error connecting to Kafka:", error);
    process.exit(1);
  }
}

module.exports = { producer, consumer, connect };
