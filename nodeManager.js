const axios = require('axios');
const config = require('./config');

async function register(nodeId) {
  try {
    console.log(`Node ${nodeId} registered with broker.`);
    await axios.post(`http://${config.kafkaBroker}/register`, { nodeId });  // Added http://
  } catch (error) {
    console.error(`Node registration failed: ${error}`);
  }
}

async function subscribeToTopic(nodeId, topic) {
  try {
    console.log(`Node ${nodeId} subscribed to topic '${topic}'`);
    await axios.post(`http://${config.kafkaBroker}/subscribe`, { nodeId, topic });  // Added http://
  } catch (error) {
    console.error(`Node subscription failed: ${error}`);
  }
}

// New manageNodes function to handle node management tasks
async function manageNodes(nodes) {
  console.log("Managing nodes...");
  for (let node of nodes) {
    // Register each node with the broker
    await register(node.nodeId);

    // You can also add subscription logic here
    // Example: subscribing all nodes to a topic (replace 'topicName' with actual topic)
    await subscribeToTopic(node.nodeId, 'topicName');
  }
}

module.exports = { register, subscribeToTopic, manageNodes };
