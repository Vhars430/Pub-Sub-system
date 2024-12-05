class LeaderElection {
    constructor(node) {
      this.node = node;
      this.isElectionInProgress = false; // Prevent multiple elections
      this.sentMessages = new Set(); 
    }
  
    // Start the election process
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
  
      // Send messages to all higher nodes concurrently using Promise.all
      const sendMessagesPromises = higherNodes.map(async (higherNode) => {
        console.log(`Node ${this.node.nodeId}: sends message to Node ${higherNode.nodeId}`);
        await this.sendElectionMessage(higherNode);
  
        // Check if the message was sent and abort if necessary
        if (this.sentMessages.has(higherNode.nodeId)) {
          electionAborted = true;
        }
      });
  
      // Wait for all messages to be sent
      await Promise.all(sendMessagesPromises);
  
      // If election isn't aborted, listen for OK responses
      if (!electionAborted && higherNodes.length === 0) {
        await this.listenForOKResponses();
      } 
      else {
        console.log(`Node ${this.node.nodeId}: Election aborted.`);
  
        // Start the election process for the next higher node
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
          
          //await this.listenForOKResponses();

        }
  
        this.isElectionInProgress = false;
        LeaderElection.isElectionInProgress = false; 
        return;
      }
    }
  
    // Simulate sending an election message to another node
    async sendElectionMessage(targetNode) {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate delay
      await this.handleElectionResponse(targetNode);
    }
  
    // Handle election responses from higher nodes
    async handleElectionResponse(higherNode) {
      console.log(`Node ${higherNode.nodeId}: received election message from Node ${this.node.nodeId}`);
      this.sentMessages.add(higherNode.nodeId); // Mark this node as having received the election message
      this.isElectionInProgress = false;
    }
  
    // Listen for OK responses from higher nodes
    async listenForOKResponses() {
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate delay for waiting
      if (this.isElectionInProgress) {
        console.log(`Node ${this.node.nodeId}: No higher nodes, it becomes the leader.`);
        this.node.leader = this.node;
        await this.broadcastLeader();
      }
    }
  
    // Broadcast the new leader to all other nodes
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
  