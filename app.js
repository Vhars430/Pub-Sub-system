const { kafkaBroker } = require("./config");
const Node = require("./Node");
const { consumer, connect } = require("./kafkaClient");
const nodeManager = require("./nodeManager");

const totalNodes = 5;
let nodes = [];

async function initializeNodes() {
  try {
    // Initialize nodes with topics and groupIds
    const topics = [
      { nodeId: 1, topics: ["topic1", "topic2"], groupId: "group1" }, // Shared groupId
      { nodeId: 2, topics: ["topic2", "topic3"], groupId: "group1" }, // Shared groupId
      { nodeId: 3, topics: ["topic1", "topic3"], groupId: "group2" },
      { nodeId: 4, topics: ["topic1"], groupId: "group3" },
      { nodeId: 5, topics: ["topic2", "topic3"], groupId: "group4" },
    ];

    for (let i = 1; i <= totalNodes; i++) {
      const node = new Node(i, kafkaBroker, "initTopic");
      nodes.push(node);

      // Initialize node state for gossip
      node.gossip.updateState("status", {
        nodeId: i,
        status: "active",
        lastUpdated: Date.now(),
      });

      // Assign topics and groupId to node
      const nodeConfig = topics.find((t) => t.nodeId === i);
      node.topics = nodeConfig.topics;
      node.groupId = nodeConfig.groupId; // Set the groupId for the node

      // Start listening for each node
      await node.startListening();
    }

    // Manage nodes with updated topic and groupId information
    await nodeManager.manageNodes(topics);

    console.log(
      `Nodes Initialized! ${totalNodes} nodes initialized and started`
    );
  } catch (error) {
    console.error("Failed to initialize nodes:", error);
    process.exit(1);
  }
}

async function startKafka() {
  await connect();

  for (const node of nodes) {
    if (node.topics && node.topics.length > 0) {
      // Subscribe to all topics assigned to this node
      for (const nodeTopic of node.topics) {
        await consumer.subscribe({
          topic: nodeTopic,
          groupId: node.groupId, // Use the group's ID for shared consumption
        });

        await consumer.run({
          eachMessage: async ({ topic, partition, message }) => {
            console.log(
              `Node ${node.nodeId} (Group: ${
                node.groupId
              }) received message on ${topic}: ${message.value.toString()}`
            );
          },
        });
      }
    } else {
      console.error(`Node ${node.nodeId} has no assigned topics.`);
    }
  }

  // Simulate node failure
  simulateNodeFailure();

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
