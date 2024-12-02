

class LeaderElection {
  constructor(node) {
    this.node = node;
    this.isElectionInProgress = false; // Prevent multiple elections
    this.sentMessages = new Set(); 
  }

  // Start the election process from an active node
  async startElection() {
    if (this.isElectionInProgress) {
      console.log(`Node ${this.node.nodeId}: Election is already in progress.`);
      return;
    }

    this.isElectionInProgress = true;
    console.log(`Node ${this.node.nodeId}: starts an election.`);

    const higherNodes = this.node.getActiveNodes().filter(node => node.nodeId > this.node.nodeId);
    let electionAborted = false;

    for (const higherNode of higherNodes) {
      if (!electionAborted) {
        console.log(`Node ${this.node.nodeId}: sends message to Node ${higherNode.nodeId}`);
        await this.sendElectionMessage(higherNode);

        if (this.sentMessages.has(higherNode.nodeId)) {
          electionAborted = true;
          break;
        }
      }
    }

    if (!electionAborted && higherNodes.length === 0) {
      await this.listenForOKResponses();
    } else {
      console.log(`Node ${this.node.nodeId}: Election aborted.`);
      const nextNode = this.node.getNextNode();
      let nextNodeFound = false;
      for (let nextNode of this.node.getActiveNodes()) {
      if (nextNode.nodeId > this.node.nodeId) {
        // If the next node is alive, start election
        if (nextNode.isAlive) {
          console.log(`Node ${this.node.nodeId}: Next node ${nextNode.nodeId} is alive, starting election.`);
          const nextElection = new LeaderElection(nextNode);
          nextNode.setNodes(this.node.nodes);
          await nextElection.startElection();
          nextNodeFound = true;
          break;  // Exit after starting election for the next node
        } else {
          console.log(`Node ${this.node.nodeId}: Next node ${nextNode.nodeId} is not alive, skipping election.`);
          continue;
        }
      }
    }

    // If no live next node was found, continue with the current election process
    if (!nextNodeFound) {
      console.log(`Node ${this.node.nodeId}: No alive next node found, completing current election.`);
    }
      
  
      this.isElectionInProgress = false;
      return;

    
    }
  }

  // Simulate sending an election message to another node
  async sendElectionMessage(targetNode) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    await this.handleElectionResponse(targetNode);
  }

  async handleElectionResponse(higherNode) {
    console.log(`Node ${higherNode.nodeId}: received election message from Node ${this.node.nodeId}`);
    this.sentMessages.add(higherNode.nodeId);
    this.isElectionInProgress = false;
  }

  async listenForOKResponses() {
    await new Promise(resolve => setTimeout(resolve, 3000));
    if (this.isElectionInProgress) {
      console.log(`Node ${this.node.nodeId}: No higher nodes, it becomes the leader.`);
      this.node.leader = this.node;
      await this.broadcastLeader();
    }
  }

  // Broadcast leader to other nodes using the broker list
  async broadcastLeader() {
    for (const targetNode of this.node.getActiveNodes()) {
      if (targetNode.nodeId !== this.node.nodeId) {
        targetNode.setLeader(this.node);
        const coordinatorMessage = {
          type: 'COORDINATOR',
          sourceId: this.node.nodeId,
          targetId: targetNode.nodeId,
          leaderId: this.node.nodeId,
        };
        console.log(`Node ${this.node.nodeId}: sends message to Node ${targetNode.nodeId}: ${JSON.stringify(coordinatorMessage)}`);
        try {
          await this.node.publishMessage({
            type: 'COORDINATOR',
            targetId: targetNode.nodeId,
            payload: coordinatorMessage,
          });
        } catch (error) {
          console.error(`Node ${this.node.nodeId}: Failed to broadcast leader to Node ${targetNode.nodeId}:`, error.message);
        }
      }
    }
  }
}

module.exports = LeaderElection;
 //   if (nextNode && nextNode.isAlive) {
    //     console.log(`Node ${this.node.nodeId}: Next node ${nextNode.nodeId} is alive, starting election.`);
    //     const nextElection = new LeaderElection(nextNode);
    //     nextNode.setNodes(this.node.nodes);
    //     await nextElection.startElection();
    //   } 
    //   if(!nextNode.isAlive){

    //     await this.listenForOKResponses();
    //     console.log(`Node ${this.node.nodeId}: Next node ${nextNode.nodeId} is not alive, election skipped.`);

    //   }