import nodeService from '../services/nodeService';
import config from '../config';
import { NodeInfo } from '../types';

describe('节点服务', () => {
  beforeEach(() => {
    // 重置节点服务的状态
    nodeService['nodes'].clear();
    nodeService['isInitialized'] = false;
  });

  describe('节点管理', () => {
    const testNode: NodeInfo = {
      nodeId: 'test-node-1',
      publicKey: 'test-public-key',
      url: 'http://localhost:3001'
    };

    test('应该能够添加节点', () => {
      nodeService.addNode(testNode);
      const nodes = nodeService.getAllNodes();
      
      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toEqual(testNode);
    });

    test('应该能够移除节点', () => {
      // 先添加节点
      nodeService.addNode(testNode);
      expect(nodeService.getAllNodes()).toHaveLength(1);

      // 移除节点
      nodeService.removeNode(testNode.nodeId);
      expect(nodeService.getAllNodes()).toHaveLength(0);
    });

    test('移除不存在的节点不应该抛出错误', () => {
      expect(() => {
        nodeService.removeNode('non-existent-node');
      }).not.toThrow();
    });
  });

  describe('初始化', () => {
    test('主节点应该能够正确初始化', async () => {
      // 设置为主节点
      Object.defineProperty(config, 'isMasterNode', {
        get: () => true
      });

      await nodeService.initialize();
      expect(nodeService['isInitialized']).toBe(true);

      const nodes = nodeService.getAllNodes();
      expect(nodes).toHaveLength(1);
      expect(nodes[0].nodeId).toBe(config.nodeId);
    });
  });

  describe('签名请求', () => {
    const testRequest = {
      messageHash: 'test-hash',
      userId: 'test-user'
    };

    beforeEach(() => {
      // 设置为主节点
      Object.defineProperty(config, 'isMasterNode', {
        get: () => true
      });
    });

    test('应该能够处理签名请求', async () => {
      await nodeService.initialize();
      const signatures = await nodeService.requestSignaturesFromNodes(testRequest);

      expect(signatures).toBeDefined();
      expect(Array.isArray(signatures)).toBe(true);
      expect(signatures.length).toBeGreaterThan(0);

      const signature = signatures[0];
      expect(signature.nodeId).toBe(config.nodeId);
      expect(signature.signature).toBeDefined();
      expect(signature.publicKey).toBeDefined();
    });

    test('没有可用节点时应该返回空数组', async () => {
      // 清空所有节点
      nodeService['nodes'].clear();
      const signatures = await nodeService.requestSignaturesFromNodes(testRequest);
      expect(signatures).toHaveLength(0);
    });
  });

  describe('错误处理', () => {
    test('初始化失败时应该抛出错误', async () => {
      // 模拟网络错误
      Object.defineProperty(config, 'isMasterNode', {
        get: () => false
      });
      Object.defineProperty(config, 'masterNodeUrl', {
        get: () => 'http://invalid-url'
      });

      await expect(nodeService.initialize()).rejects.toThrow();
    });

    test('请求签名失败时应该返回空数组', async () => {
      // 添加一个无效的节点
      nodeService.addNode({
        nodeId: 'invalid-node',
        publicKey: 'test-public-key',
        url: 'http://invalid-url'
      });

      const signatures = await nodeService.requestSignaturesFromNodes({
        messageHash: 'test-hash',
        userId: 'test-user'
      });

      expect(signatures).toHaveLength(0);
    });
  });
}); 