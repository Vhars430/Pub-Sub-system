class VirtualRing {
  constructor(nodeId, totalNodes) {
    this.nodeId = nodeId;
    this.totalNodes = totalNodes;
    this.neighbors = [];
    this.failedNodes = new Set();
  }

  setupRing() {
    const prevNode = this.nodeId === 1 ? this.totalNodes : this.nodeId - 1;
    const nextNode = this.nodeId === this.totalNodes ? 1 : this.nodeId + 1;

    this.neighbors = [prevNode, nextNode];
    console.log(
      `Node ${this.nodeId}: Neighbors are ${this.neighbors.join(", ")}`
    );
  }

  handleNodeFailure(failedNodeId) {
    if (failedNodeId === this.nodeId) {
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

    this.failedNodes.add(failedNodeId);

    if (failedNodeId) {
      this.neighbors = this.neighbors.filter(
        (neighbor) => neighbor !== failedNodeId
      );
      console.log(
        `Node ${this.nodeId}: Neighbors updated to ${this.neighbors.join(", ")}`
      );
    }

    this.propagateFailure(failedNodeId);
  }

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

  getNeighbors() {
    return this.neighbors;
  }
}

module.exports = VirtualRing;
