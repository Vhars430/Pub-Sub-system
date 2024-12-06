class LeaderElection {
    constructor(node) {
      this.node = node;
      this.isElectionInProgress = false;
      this.sentMessages = new Set(); 
    }
  
    async startElection() {
      if (this.isElectionInProgress) {
        console.log(`Node ${this.node.nodeId}: Election is already in progress.`);
        return;
      }
  
      this.isElectionInProgress = true;
      LeaderElection.isElectionInProgress = true; 
      console.log(`Node ${this.node.nodeId}: starts an election.`);
  
      const higherNodes = this.node.getActiveNodes().filter(node => node.nodeId > this.node.nodeId  && node.isAlive);
      let electionAborted = false;
  
      const sendMessagesPromises = higherNodes.map(async (higherNode) => {
        console.log(`Node ${this.node.nodeId}: sends message to Node ${higherNode.nodeId}`);
        await this.sendElectionMessage(higherNode);
  
        if (this.sentMessages.has(higherNode.nodeId)) {
          electionAborted = true;
        }
      });
  
      await Promise.all(sendMessagesPromises);
  
      if (!electionAborted && higherNodes.length === 0) {
        await this.listenForOKResponses();
      } 
      else {
        console.log(`Node ${this.node.nodeId}: Election aborted.`);
  
        const nextNode = this.node.getNextNode();
        let nextNodeFound = false;
        for (let nextNode of this.node.getActiveNodes()) {
          if (nextNode.nodeId > this.node.nodeId) {
            if (nextNode.isAlive) {
              console.log(`Node ${this.node.nodeId}: Next node ${nextNode.nodeId} is alive, starting election.`);
              const nextElection = new LeaderElection(nextNode);
              nextNode.setNodes(this.node.nodes);
              await nextElection.startElection();
              nextNodeFound = true;
              break;
            } else {
              console.log(`Node ${this.node.nodeId}: Next node ${nextNode.nodeId} is not alive, skipping election.`);
              continue;
            }
          }
        }
  
        if (!nextNodeFound) {
          console.log(`Node ${this.node.nodeId}: No alive next node found, completing current election.`);
        }
  
        this.isElectionInProgress = false;
        LeaderElection.isElectionInProgress = false; 
        return;
      }
    }
  
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
  