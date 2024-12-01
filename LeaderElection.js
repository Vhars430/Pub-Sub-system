class LeaderElection {
    constructor(node) {
      this.node = node;
      this.isElectionInProgress = false; // Prevent multiple elections
      this.sentMessages = new Set(); // Tracks sent messages to avoid re-sending them
    }
  
    // Start the election process from an active node
    async startElection() {
      // Prevent starting multiple elections
      if (this.isElectionInProgress) {
        console.log(`Node ${this.node.nodeId}: Election is already in progress.`);
        return;
      }
  
      this.isElectionInProgress = true;
      console.log(`Node ${this.node.nodeId}: starts an election.`);
  
      // Step 1: Send ELECTION message to nodes with IDs greater than the current node's ID
      const higherNodes = this.node.getActiveNodes().filter(node => node.nodeId > this.node.nodeId);
      let electionAborted = false;
  
      // Send election messages to all higher nodes
      for (const higherNode of higherNodes) {
        if (!electionAborted) {
          console.log(`Node ${this.node.nodeId}: sends message to Node ${higherNode.nodeId}: { type: 'ELECTION', sourceId: ${this.node.nodeId}, targetId: ${higherNode.nodeId} }`);
          // Simulate sending the election message
          await this.sendElectionMessage(higherNode);
          // After sending, we assume we wait for OK messages
          if (this.sentMessages.has(higherNode.nodeId)) {
            electionAborted = true;  // Election is aborted due to receiving OK
            break;
          }
        }
      }
  
      // Step 2: If no higher nodes, this node becomes the leader
      if (!electionAborted && higherNodes.length === 0) {
        // console.log(`Node ${this.node.nodeId}: No higher nodes. It becomes the leader.`);
        // this.node.leader = this.node; // This node becomes the leader
        // console.log(`Node ${this.node.nodeId} has become the leader.`);
  
        // // Step 3: Broadcast leader to other nodes
        // await this.broadcastLeader();
        await this.listenForOKResponses();
      } 
      else {
        // If election is aborted, start the election for the next node
        console.log(`Node ${this.node.nodeId}: Election aborted, triggering next node's election.`);
  
        // Find the next node and start its election
        const nextNode = this.node.getNextNode();
        if (nextNode) {
          console.log(`Node ${this.node.nodeId}: Triggering election for Node ${nextNode.nodeId}.`);
          const nextElection = new LeaderElection(nextNode);
          nextNode.setNodes(this.node.nodes); // Set the active nodes
          await nextElection.startElection();
        }
  
        // Exit after aborting
        this.isElectionInProgress = false;
        return;
      }
  
      // Step 4: Listen for responses and handle the "OK" messages from higher nodes
      //await this.listenForOKResponses();
    }
  
    // Simulate sending an election message to another node
    async sendElectionMessage(targetNode) {
      // Simulate message delay
      await new Promise(resolve => setTimeout(resolve, 2000));
  
      // Simulate receiving OK response from a higher node
      await this.handleElectionResponse(targetNode);
    }
  
    // Handle the election response (OK message) from a higher node
    async handleElectionResponse(higherNode) {
      console.log(`Node ${higherNode.nodeId}: received election message from Node ${this.node.nodeId}`);
      console.log(`Node ${higherNode.nodeId}: sends OK message to Node ${this.node.nodeId}: { type: 'OK', sourceId: ${higherNode.nodeId}, targetId: ${this.node.nodeId} }`);
  
      // Node with higher ID is taking over, so this node stops its election process
      this.sentMessages.add(higherNode.nodeId); // Mark that we've sent an "OK" response
      this.isElectionInProgress = false; // Election is over for this node
    }
  
    // Listen for "OK" responses (in a real system, this would be event-driven)
    async listenForOKResponses() {
      // Simulate waiting for OK responses (this can be modified to a more event-driven system)
      await new Promise(resolve => setTimeout(resolve, 3000)); // Simulate response delay
  
      // If no responses received, this node is the leader
      if (this.isElectionInProgress) {
        console.log(`Node ${this.node.nodeId}: No higher nodes, it becomes the leader.`);
        this.node.leader = this.node; // This node becomes the leader
        console.log(`Node ${this.node.nodeId} has become the leader.`);
  
        // Broadcast the leader to all other nodes
        await this.broadcastLeader();
      }
    }
  
    // Broadcast the leader to all nodes
    async broadcastLeader() {
      const allNodes = this.node.getActiveNodes();
      for (const targetNode of allNodes) {
        if (targetNode.nodeId !== this.node.nodeId) {
          targetNode.setLeader(this.node);
          const coordinatorMessage = {
            type: 'COORDINATOR',
            sourceId: this.node.nodeId,
            targetId: targetNode.nodeId,
            leaderId: this.node.nodeId,
          };
        
  
          console.log(`Node ${this.node.nodeId}: sends message to Node ${targetNode.nodeId}: ${JSON.stringify(coordinatorMessage)}`);
          // Simulate publishing the message (this would be done in real-world)
          await this.node.publishMessage({
            type: 'COORDINATOR',
            targetId: targetNode.nodeId,
            payload: coordinatorMessage,
        });
        }
      }
    }
      
    }
  
    
  
  
  module.exports = LeaderElection;
  