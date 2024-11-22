const axios = require("axios");
const config = require("./config");

async function notifyFailure(nodeId) {
  try {
    console.log(`Node ${nodeId} has failed. Notifying other nodes...`);
    await axios.post(`${config.kafkaBroker}/notifyFailure`, { nodeId });
  } catch (error) {
    console.error(`Failed to notify failure for Node ${nodeId}: ${error}`);
  }
}

function checkGossipState(node) {
  const heartbeats = node.gossip.state;
  const now = Date.now();
  const timeoutMs = 15000; // 15 seconds timeout

  for (const [nodeId, data] of heartbeats.entries()) {
    if (data.value.timestamp < now - timeoutMs) {
      notifyFailure(nodeId);
    }
  }
}

function monitorFailures() {
  setInterval(() => {
    nodes.forEach(node => {
      checkGossipState(node);
    });
  }, 5000);
}

module.exports = { monitorFailures };
