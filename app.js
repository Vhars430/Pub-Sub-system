const express = require('express');
const kafka = require('./kafkaClient');
const failureManager = require('./failureManager');
const nodeManager = require('./nodeManager');
const VirtualRing = require('./VirtualRing');
const config = require('./config'); // Assuming this has config data such as total nodes

const app = express();
const port = 3000;
const totalNodes = config.totalNodes || 5; // Number of nodes in the virtual ring

// Create nodes in the virtual ring
const nodes = [];
for (let i = 1; i <= totalNodes; i++) {
  const node = new VirtualRing(i, totalNodes);
  node.setupRing();  // Set up ring connections and partitions
  nodes.push(node);
}

// Register failure handlers for each node to respond to node failures
nodes.forEach((node, index) => {
  node.registerFailureHandler(index, (failedNodeId) => node.handleNodeFailure(failedNodeId));
});

// Example: Simulate a failure in one of the nodes (e.g., Node 3 fails, triggering reconfiguration)
nodes[0].handleNodeFailure(3);  // You can remove or replace this line as needed

// Start Kafka Client
kafka.connect().then(() => {
  console.log('Kafka client connected');
}).catch(err => {
  console.error('Error connecting to Kafka:', err);
});

// Setup Kafka consumer event listeners (valid events)
const { consumer } = kafka;
consumer.on(consumer.events.CONNECT, () => console.log('Consumer connected'));
consumer.on(consumer.events.DISCONNECT, () => console.log('Consumer disconnected'));
consumer.on(consumer.events.CRASH, (event) => console.error('Consumer crashed', event.payload.error));

// Set up routes or application logic
app.get('/', (req, res) => {
  res.send('PubSub System Running!');
});

// Use failure manager for fault tolerance
failureManager.monitorFailures();  // Ensure this is properly defined in failureManager.js

// Use node manager for node operations (e.g., adding/removing nodes, reconfiguring)
nodeManager.manageNodes(nodes);  // Make sure this function is defined and properly manages nodes

// Start the express server
app.listen(port, () => {
  console.log(`App is listening on port ${port}`);
});
