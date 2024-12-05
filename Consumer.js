const cluster = require("cluster");
const numCPUs = require("os").cpus().length;
const { Kafka } = require("kafkajs");
const { kafkaBroker } = require("./config");

if (cluster.isMaster) {
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
  });
} else {
  const kafka = new Kafka({
    clientId: "node",
    brokers: kafkaBroker.split(","),
  });

  const consumer = kafka.consumer({ groupId: "test-group" });

  (async () => {
    await consumer.connect();
    await consumer.subscribe({ topic: "topicA", fromBeginning: true });

    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log(`Received message: ${message.value.toString()}`);
      },
    });
  })().catch(console.error);
}
