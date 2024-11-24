const { kafkaBroker } = require("./config");
const Node = require("./Node");
const VirtualRing = require("./VirtualRing");
const { producer, consumer, connect } = require("./kafkaClient");
const failureManager = require("./failureManager");

const topic = "topicName";
const totalNodes = 5;
let nodes = [];

async function initializeNodes() {
  try {
    for (let i = 1; i <= totalNodes; i++) {
      const node = new Node(i, kafkaBroker, topic);
      nodes.push(node);

      // Initialize node state for gossip
      node.gossip.updateState("status", {
        nodeId: i,
        status: "active",
        lastUpdated: Date.now(),
      });

      // Start listening for each node
      await node.startListening();
    }
    console.log(`${totalNodes} nodes initialized and started`);
  } catch (error) {
    console.error("Failed to initialize nodes:", error);
    process.exit(1);
  }
}

async function startKafka() {
  await connect();
  await consumer.subscribe({ topic });

  // // Listening for messages
  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      console.log(`Received message on ${topic}: ${message.value.toString()}`);
    },
  });

  // Simulate node failure
  simulateNodeFailure();

  // Node registration and subscription
  nodes.forEach(async (node) => {
    try {
      console.log(`Node ${node.nodeId} registered with broker.`);
    } catch (error) {
      console.error(`Node ${node.nodeId} registration failed:`, error.message);
    }
  });

  // Start gossip example
  startGossipExample();

  // Start heartbeats after nodes are initialized
  startHeartbeats();

  console.log("App is listening on port 3000");
}

// Simulate a node failure
function simulateNodeFailure() {
  setTimeout(() => {
    const failedNodeId = 3; // Simulate failure of node 3
    console.log(`Node ${failedNodeId} failed. Updating virtual ring.`);
    nodes.forEach((node) => {
      node.virtualRing.handleNodeFailure(failedNodeId);
    });
  }, 5000); // After 5 seconds, simulate a failure of node 3
}

// Simulate nodes sharing information via gossip
async function startGossipExample() {
  setInterval(() => {
    nodes.forEach((node) => {
      node.updateGossipState("heartbeat", {
        nodeId: node.nodeId,
        timestamp: Date.now(),
        status: "active",
      });
    });
  }, 5000);
}

// Add heartbeat monitoring
function startHeartbeats() {
  setInterval(() => {
    nodes.forEach((node) => {
      node.gossip.updateState("heartbeat", {
        nodeId: node.nodeId,
        timestamp: Date.now(),
      });
    });
  }, 5000); // Send heartbeat every 5 seconds
}

// Start the application
initializeNodes();
startKafka();
