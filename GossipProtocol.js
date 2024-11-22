class GossipProtocol {
  constructor(node, gossipInterval = 1000) {
    this.node = node;
    this.gossipInterval = gossipInterval;
    this.state = new Map(); // Store state information
    this.version = 0; // Version number for state updates
    this.running = false;
  }

  // Start the gossip protocol
  start() {
    this.running = true;
    this.gossipLoop();
  }

  // Stop the gossip protocol
  stop() {
    this.running = false;
  }

  // Update local state
  updateState(key, value) {
    this.version++;
    this.state.set(key, {
      value,
      version: this.version,
      timestamp: Date.now()
    });
  }

  // Merge received state with local state
  mergeState(receivedState) {
    for (const [key, received] of Object.entries(receivedState)) {
      const local = this.state.get(key);
      if (!local || received.version > local.version) {
        this.state.set(key, received);
      }
    }
  }

  // Main gossip loop
  async gossipLoop() {
    while (this.running) {
      try {
        // Select random neighbor
        const neighbor = this.selectRandomNeighbor();
        if (neighbor) {
          await this.sendGossip(neighbor);
        }
        // Ensure positive timeout value
        const timeout = Math.max(this.gossipInterval, 1000);
        await new Promise(resolve => setTimeout(resolve, timeout));
      } catch (error) {
        console.error('Gossip error:', error);
      }
    }
  }

  // Select random neighbor from virtual ring
  selectRandomNeighbor() {
    const neighbors = this.node.virtualRing.neighbors;
    if (neighbors.length === 0) return null;
    return neighbors[Math.floor(Math.random() * neighbors.length)];
  }

  // Send gossip to neighbor
  async sendGossip(neighborId) {
    try {
      const message = {
        type: 'GOSSIP',
        sourceId: this.node.nodeId,
        state: Object.fromEntries(this.state),
        timestamp: Date.now()
      };
      
      await this.node.publishMessage({
        type: 'GOSSIP',
        targetId: neighborId,
        payload: message
      });
    } catch (error) {
      console.error(`Failed to send gossip from node ${this.node.nodeId} to ${neighborId}:`, error);
    }
  }
}

module.exports = GossipProtocol; 