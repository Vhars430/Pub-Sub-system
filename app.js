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
      { nodeId: 1, topics: ["topic1", "topic2"], groupId: "group1" },
      { nodeId: 2, topics: ["topic2", "topic3"], groupId: "group1" },
      { nodeId: 3, topics: ["topic1", "topic3"], groupId: "group2" },
      { nodeId: 4, topics: ["topic1"], groupId: "group3" },
      { nodeId: 5, topics: ["topic2", "topic3"], groupId: "group4" },
    ];

    for (let i = 1; i <= totalNodes; i++) {
      const node = new Node(i, kafkaBroker, "initTopic", groupId = "pubsub-system-group", nodes);
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
      node.groupId = nodeConfig.groupId;

      // Start listening for each node
      await node.startListening();
    }

    // Manage nodes with updated topic and groupId information
    await nodeManager.manageNodes(topics);

    console.log(
      `Nodes Initialized! ${totalNodes} nodes initialized and started`
    );
    startElection();
  } catch (error) {
    console.error("Failed to initialize nodes:", error);
    process.exit(1);
  }
}

async function startKafka() {
  try {
    await connect();

    // Subscribe to all topics for each node before starting the consumer
    for (const node of nodes) {
      if (node.topics && node.topics.length > 0) {
        for (const nodeTopic of node.topics) {
          await consumer.subscribe({
            topic: nodeTopic,
            groupId: node.groupId, // Use the group's ID for shared consumption
          });
        }
      } else {
        console.error(`Node ${node.nodeId} has no assigned topics.`);
      }
    }

    // After subscribing to all topics, start consuming messages
    await consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        console.log(
          `Node received message on ${topic}: ${message.value.toString()}`
        );
      },
    });

    console.log("App is listening on port 3000");
  } catch (error) {
    console.error("Failed to start Kafka:", error);
    process.exit(1);
  }
}

// Simulate a node failure
function simulateNodeFailure(failedNodeId) {
  setTimeout(() => {
    console.log(`Node ${failedNodeId} failed. Updating virtual ring.`);
    const failedNode = nodes.find(node => node.nodeId === failedNodeId);
    if (failedNode) {
      failedNode.crash(); // Mark node as crashed
        }

    // Update the virtual ring for each node and log the neighbors
    nodes.forEach((node) => {
      console.log(
        `Before failure: Node ${node.nodeId} neighbors:`,
        node.neighbors
      );
      node.virtualRing.handleNodeFailure(failedNodeId);

      // Update neighbors after the failure
      node.updateNeighbors();

      console.log(
        `Node ${node.nodeId} updated virtual ring, new neighbors:`,
        node.neighbors
      );
    });
  }, 3000); 
  // After 3 seconds, simulate a failure of node 3
  setTimeout(() => {
    console.log(`Reviving Node ${failedNodeId}`);
    const revivedNode = nodes.find(node => node.nodeId === failedNodeId);
    if (revivedNode) {
        revivedNode.revive(failedNodeId); // Mark node as revived
    }
}, 8000); 
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

function startElection() {
  console.log("Starting leader election...");
  
  // Trigger election from any active node except the leader (we'll assume the first node is the leader initially)
  const activeNodes = nodes.filter(node => node.isAlive);
   //&& node.nodeId !== 1); // Exclude node 1, the initial leader
  if (activeNodes.length > 0) {
    const electionStarter = activeNodes[0]; // You can implement logic to pick any active node
    electionStarter.leaderElection.startElection(); // Trigger election from this node
  } else {
    console.log("No active nodes available to start election.");
  }
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
async function startApp() {
  try {
    // First initialize the nodes
    await initializeNodes();
    // Then start Kafka
    await startKafka();

    // Simulate node 3 failure
    console.log("Simulating node 5 failure...");
    simulateNodeFailure(5);

    // Start gossip example
    console.log("Starting gossip example...");
    await startGossipExample();

    
    // Start heartbeats after nodes are initialized
    console.log("Starting heartbeats...");
    startHeartbeats();
  } catch (error) {
    console.error("Error starting application:", error);
    process.exit(1);
  }
}

startApp();
