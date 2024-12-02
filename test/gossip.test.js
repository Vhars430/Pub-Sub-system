const GossipProtocol = require('../GossipProtocol');
const Node = require('../Node');
const { expect } = require('chai');
const sinon = require('sinon');

describe('Gossip Protocol Tests', () => {
  let node1, node2, gossip1, gossip2;
  
  beforeEach(() => {
    // Mock Kafka configuration
    const mockKafkaConfig = {
      kafkaBroker: 'localhost:9092',
      topic: 'test-topic'
    };
    
    // Stub the createTopicIfNotExists function
    sinon.stub(Node.prototype, 'startListening').resolves();
    
    // Create test nodes with mocked config
    node1 = new Node('node1', mockKafkaConfig.kafkaBroker, mockKafkaConfig.topic);
    node2 = new Node('node2', mockKafkaConfig.kafkaBroker, mockKafkaConfig.topic);
    
    gossip1 = node1.gossip;
    gossip2 = node2.gossip;
  });

  afterEach(() => {
    if (gossip1) gossip1.stop();
    if (gossip2) gossip2.stop();
    sinon.restore();
  });

  // Happy Path Test
  it('should successfully propagate state updates between nodes', async () => {
    // Update state in first node
    const testValue = 'test123';
    gossip1.updateState('testKey', testValue);
    
    // Simulate gossip message receipt
    await node2.handleGossipMessage({
      sourceId: 'node1',
      state: Object.fromEntries(gossip1.state),
      timestamp: Date.now()
    });

    // Verify state propagation - check the value property
    const node2State = gossip2.state.get('testKey');
    expect(node2State.value).to.equal(testValue);
  });

  // Version Control Test
  it('should only update state if received version is newer', () => {
    const oldValue = 'oldValue';
    const newValue = 'newValue';
    
    // Set initial state with old version
    gossip1.updateState('key1', oldValue);
    
    // Set newer state in gossip2
    gossip2.version = gossip1.version + 1;
    gossip2.updateState('key1', newValue);
    
    // Try to merge older state into newer
    gossip2.mergeState(Object.fromEntries(gossip1.state));
    
    // Should keep newer value
    const finalState = gossip2.state.get('key1');
    expect(finalState.value).to.equal(newValue);
  });

  // Network Error Test
  it('should handle network errors gracefully when sending gossip', async () => {
    const publishStub = sinon.stub(node1, 'publishMessage').throws(new Error('Network Error'));
    
    // Should not throw error
    await gossip1.sendGossip('node2');
    
    expect(publishStub.calledOnce).to.be.true;
  });

  // Simple State Validation Test (replacing the invalid state test)
  it('should maintain state consistency when updating', () => {
    // Update state
    gossip1.updateState('testKey', 'testValue');
    
    // Verify state structure
    const state = gossip1.state.get('testKey');
    
    // Check basic state properties
    expect(state).to.have.property('value', 'testValue');
    expect(state).to.have.property('version').that.is.a('number');
    expect(state).to.have.property('timestamp').that.is.a('number');
  });
}); 