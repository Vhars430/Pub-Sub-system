const { Kafka } = require('kafkajs');
const Node = require('./Node');
const VirtualRing = require('./VirtualRing');
const { producer, consumer, connect } = require('./kafkaClient');
const failureManager = require('./failureManager');

const topic = 'topicName';
const totalNodes = 5;
let nodes = [];

async function initializeNodes() {
  for (let i = 1; i <= totalNodes; i++) {
    const node = new Node(i, 'localhost:9092', topic);
    nodes.push(node);
    const virtualRing = new VirtualRing(i, totalNodes);
    virtualRing.setupRing();  // Setup the ring with neighbors
  }
}

async function startKafka() {
  await connect();
  await consumer.subscribe({ topic });
  
  // // Listening for messages
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log(`Received message on ${topic}: ${message.value.toString()}`);
    }
  });

  // Simulate node failure
  simulateNodeFailure();

  // Node registration and subscription
  nodes.forEach(async (node) => {
    try {
      console.log(`Node ${node.nodeId} registered with broker.`);
      await node.startListening();  // Start each node listening to the topic
    } catch (error) {
      console.error(`Node ${node.nodeId} registration failed:`, error.message);
    }
  });

  console.log("App is listening on port 3000");
}

// Simulate a node failure
function simulateNodeFailure() {
  setTimeout(() => {
    const failedNodeId = 3;  // Simulate failure of node 3
    console.log(`Node ${failedNodeId} failed. Updating virtual ring.`);
    nodes.forEach((node) => {
      node.virtualRing.handleNodeFailure(failedNodeId);
    });
  }, 5000);  // After 5 seconds, simulate a failure of node 3
}

// Start the application
initializeNodes();
startKafka();
