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
    console.log(
      `Node ${this.nodeId}: Neighbors are ${this.neighbors.join(", ")}`
    );
  }

  // Handle a node failure and propagate it to the neighbors
  handleNodeFailure(failedNodeId) {
    if (failedNodeId === this.nodeId) {
      //console.log(`Node ${this.nodeId}: Skipping self failure detection.`);
      return;
    }
    console.log(
      `Node ${this.nodeId} detected failure of Node ${failedNodeId}. Reconfiguring ring...`
    );
    
    if (this.failedNodes.has(failedNodeId)) {
      console.log(
        `Node ${this.nodeId}: Already processed failure of Node ${failedNodeId}`
      );
      return;
    }

    this.failedNodes.add(failedNodeId); // Mark the failure as processed

    if (failedNodeId) {
      // Remove the failed node from the neighbors list
      this.neighbors = this.neighbors.filter(
        (neighbor) => neighbor !== failedNodeId
      );
      console.log(
        `Node ${this.nodeId}: Neighbors updated to ${this.neighbors.join(", ")}`
      );
    }

    // Propagate the failure notification to neighbors
    this.propagateFailure(failedNodeId);
  }

  // Propagate the failure notification to neighbors
  propagateFailure(failedNodeId) {
    console.log(
      `Node ${this.nodeId}: Forwarding path for failed node ${failedNodeId} reassigned`
    );
    this.neighbors.forEach((neighbor) => {
      if (!this.failedNodes.has(neighbor)) {
        console.log(
          `Node ${this.nodeId}: Notifying Node ${neighbor} about failure of Node ${failedNodeId}`
        );
      }
    });
  }

  // Get the current neighbors of the node
  getNeighbors() {
    return this.neighbors;
  }
}

module.exports = VirtualRing;
