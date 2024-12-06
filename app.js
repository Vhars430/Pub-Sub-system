const { kafkaBroker } = require("./config");
const Node = require("./Node");
const { consumer, connect } = require("./kafkaClient");
const nodeManager = require("./nodeManager");

const totalNodes = 5;
let nodes = [];

async function initializeNodes() {
  try {
    const topics = [
      { nodeId: 1, topics: ["topic1", "topic2"], groupId: "group1" },
      { nodeId: 2, topics: ["topic2", "topic3"], groupId: "group1" },
      { nodeId: 3, topics: ["topic1", "topic3"], groupId: "group2" },
      { nodeId: 4, topics: ["topic1"], groupId: "group3" },
      { nodeId: 5, topics: ["topic2", "topic3"], groupId: "group4" },
    ];

    for (let i = 1; i <= totalNodes; i++) {
      const node = new Node(
        i,
        "initTopic",
        (groupId = "pubsub-system-group"),
        nodes
      );
      nodes.push(node);

      node.gossip.updateState("status", {
        nodeId: i,
        status: "active",
        lastUpdated: Date.now(),
      });

      const nodeConfig = topics.find((t) => t.nodeId === i);
      node.topics = nodeConfig.topics;
      node.groupId = nodeConfig.groupId;

      await node.startListening();
    }

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
  try {
    await connect();

    for (const node of nodes) {
      if (node.topics && node.topics.length > 0) {
        for (const nodeTopic of node.topics) {
          await consumer.subscribe({
            topic: nodeTopic,
            groupId: node.groupId,
          });
        }
      } else {
        console.error(`Node ${node.nodeId} has no assigned topics.`);
      }
    }

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
    const failedNode = nodes.find((node) => node.nodeId === failedNodeId);
    if (failedNode) {
      failedNode.crash();
    }

    // Update the virtual ring for each node and log the neighbors
    nodes.forEach((node) => {
      console.log(
        `Before failure: Node ${node.nodeId} neighbors:`,
        node.neighbors
      );
      node.virtualRing.handleNodeFailure(failedNodeId);

      node.updateNeighbors();

      console.log(
        `Node ${node.nodeId} updated virtual ring, new neighbors:`,
        node.neighbors
      );
    });
  }, 3000);

  setTimeout(() => {
    console.log(`Reviving Node ${failedNodeId}`);
    const revivedNode = nodes.find((node) => node.nodeId === failedNodeId);
    if (revivedNode) {
      revivedNode.revive(failedNodeId);
    }
  }, 8000);
}

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

  const activeNodes = nodes.filter((node) => node.isAlive);
  if (activeNodes.length > 0) {
    const electionStarter = activeNodes[0];
    electionStarter.leaderElection.startElection();
  } else {
    console.log("No active nodes available to start election.");
  }
}

function startHeartbeats() {
  setInterval(() => {
    nodes.forEach((node) => {
      node.gossip.updateState("heartbeat", {
        nodeId: node.nodeId,
        timestamp: Date.now(),
      });
    });
  }, 5000);
}

async function startApp() {
  try {
    await initializeNodes();
    await startKafka();

    console.log("Simulating node 5 failure...");
    simulateNodeFailure(5);

    console.log("Starting gossip example...");
    await startGossipExample();

    startElection();

    console.log("Starting heartbeats...");
    startHeartbeats();
  } catch (error) {
    console.error("Error starting application:", error);
    process.exit(1);
  }
}

startApp();
