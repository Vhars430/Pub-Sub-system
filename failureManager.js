const axios = require('axios');
const config = require('./config');

async function notifyFailure(nodeId) {
  try {
    console.log(`Node ${nodeId} has failed. Notifying other nodes...`);
    await axios.post(`${config.kafkaBroker}/notifyFailure`, { nodeId });
  } catch (error) {
    console.error(`Failed to notify failure for Node ${nodeId}: ${error}`);
  }
}

async function monitorFailures(nodeId) {
  // Here you would implement a monitoring process that checks if the node is still active
  // For now, simulate a failure notification after a delay for demonstration.
  setTimeout(async () => {
    await notifyFailure(nodeId);
  }, 10000);  // Simulate failure after 10 seconds
}

module.exports = { monitorFailures };
