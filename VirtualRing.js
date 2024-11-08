class VirtualRing {
  constructor(nodeId, totalNodes) {
    this.nodeId = nodeId;
    this.totalNodes = totalNodes;
    this.neighbors = [];
    this.failedNodes = new Set(); // To track failed nodes
  }

  // Setup the ring and define neighbors (assuming a ring structure)
  setupRing() {
    const prevNode = this.nodeId === 1 ? this.totalNodes : this.nodeId - 1;
    const nextNode = this.nodeId === this.totalNodes ? 1 : this.nodeId + 1;

    this.neighbors = [prevNode, nextNode];
    console.log(`Node ${this.nodeId}: Neighbors are ${this.neighbors.join(', ')}`);
  }

  // Handle a node failure and propagate it to the neighbors
  handleNodeFailure(failedNodeId) {
    console.log(`Node ${this.nodeId} detected failure of Node ${failedNodeId}. Reconfiguring ring...`);

    if (this.failedNodes.has(failedNodeId)) {
      console.log(`Node ${this.nodeId}: Already processed failure of Node ${failedNodeId}`);
      return;
    }

    this.failedNodes.add(failedNodeId); // Mark the failure as processed
    this.propagateFailure(failedNodeId);
  }

  // Propagate the failure notification to neighbors
  propagateFailure(failedNodeId) {
    console.log(`Node ${this.nodeId}: Forwarding path for failed node ${failedNodeId} reassigned`);
    this.neighbors.forEach((neighbor) => {
      if (!this.failedNodes.has(neighbor)) {
        console.log(`Node ${this.nodeId}: Notifying Node ${neighbor} about failure of Node ${failedNodeId}`);
      }
    });
  }
}

module.exports = VirtualRing;
