class GossipProtocol {
  constructor(node, gossipInterval = 1000) {
    this.node = node;
    this.gossipInterval = gossipInterval;
    this.state = new Map();
    this.version = 0;
    this.running = false;
  }

  start() {
    this.running = true;
    this.gossipLoop();
  }

  stop() {
    this.running = false;
  }

  updateState(key, value) {
    this.version++;
    this.state.set(key, {
      value,
      version: this.version,
      timestamp: Date.now()
    });
  }

  mergeState(receivedState) {
    for (const [key, received] of Object.entries(receivedState)) {
      const local = this.state.get(key);
      if (!local || received.version > local.version) {
        this.state.set(key, received);
      }
    }
  }

  async gossipLoop() {
    while (this.running) {
      try {
        const neighbor = this.selectRandomNeighbor();
        if (neighbor) {
          await this.sendGossip(neighbor);
        }
        const timeout = Math.max(this.gossipInterval, 1000);
        await new Promise(resolve => setTimeout(resolve, timeout));
      } catch (error) {
        console.error('Gossip error:', error);
      }
    }
  }

  selectRandomNeighbor() {
    const neighbors = this.node.virtualRing.neighbors;
    if (neighbors.length === 0) return null;
    return neighbors[Math.floor(Math.random() * neighbors.length)];
  }

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