/// <reference types="jest" />
import { NodeService } from '../nodeService';
import { mock } from 'jest-mock-extended';
import { ethers } from 'ethers';
import { BLSService } from '../blsService';
import type { Mock } from 'jest-mock';
import { NodeInfo } from '../../types';
import logger from '../../utils/logger';

jest.mock('ethers');
jest.mock('../blsService');

describe('NodeService', () => {
  let nodeService: NodeService;
  let mockProvider: jest.Mocked<ethers.JsonRpcProvider>;
  let mockSigner: jest.Mocked<ethers.Wallet>;
  let mockContract: ethers.Contract;
  let mockBLSService: jest.Mocked<BLSService>;
  let originalLogLevel: string;

  const mockConfig = {
    nodeId: 'test-node',
    ethereum: {
      rpcUrl: 'http://localhost:8545',
      chainId: 1,
      blsNodeRegistryAddress: '0x1234567890123456789012345678901234567890',
      privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234'
    },
    bls: {
      privateKey: '0x1234567890123456789012345678901234567890123456789012345678901234',
      publicKey: '0x1234567890123456789012345678901234567890123456789012345678901234'
    },
    isMasterNode: true
  };

  beforeAll(() => {
    // 保存原始日志级别
    originalLogLevel = logger.level;
    // 设置测试时的日志级别为debug
    logger.level = 'debug';
  });

  afterAll(() => {
    // 恢复原始日志级别
    logger.level = originalLogLevel;
  });

  beforeEach(() => {
    mockProvider = mock<ethers.JsonRpcProvider>();
    mockSigner = mock<ethers.Wallet>();

    // Mock contract methods
    const mockIsNodeRegistered = jest.fn();
    const mockDeactivateNode = jest.fn();
    const mockGetActiveNodes = jest.fn();
    const mockRegisterNode = jest.fn();

    // Create mock contract
    mockContract = {
      isNodeRegistered: mockIsNodeRegistered,
      deactivateNode: mockDeactivateNode,
      getActiveNodes: mockGetActiveNodes,
      registerNode: mockRegisterNode,
      interface: new ethers.Interface([]),
      target: mockConfig.ethereum.blsNodeRegistryAddress,
      runner: mockProvider,
      filters: {},
      fallback: null,
      connect: () => mockContract,
      attach: () => mockContract,
      getAddress: () => Promise.resolve(mockConfig.ethereum.blsNodeRegistryAddress),
      getDeployedCode: () => Promise.resolve(null),
      waitForDeployment: () => Promise.resolve(mockContract),
      queryFilter: () => Promise.resolve([]),
      listenerCount: () => 0,
      listeners: () => [],
      removeAllListeners: () => mockContract,
      off: () => mockContract,
      on: () => mockContract,
      once: () => mockContract,
      emit: () => false,
      addListener: () => mockContract,
      removeListener: () => mockContract,
      [Symbol.iterator]: function* () { yield* Object.entries(this); }
    } as unknown as ethers.Contract;

    mockBLSService = mock<BLSService>();

    // Mock ethers
    (ethers.JsonRpcProvider as unknown as jest.Mock).mockImplementation(() => mockProvider);
    (ethers.Wallet as unknown as jest.Mock).mockImplementation(() => mockSigner);
    (ethers.Contract as unknown as jest.Mock).mockImplementation(() => mockContract);

    // Mock BLSService
    (BLSService as unknown as jest.Mock).mockImplementation(() => mockBLSService);

    nodeService = new NodeService(
      mockProvider,
      mockSigner,
      mockConfig.ethereum.blsNodeRegistryAddress
    );
  });

  describe('getNodeStatus', () => {
    it('should return true when node is registered', async () => {
      const mockPublicKey = '0x1234';
      (mockBLSService.getPublicKey as jest.Mock).mockReturnValue(mockPublicKey);
      (mockContract.isNodeRegistered as unknown as jest.Mock).mockResolvedValue(true);

      const result = await nodeService.getNodeStatus();
      expect(result).toBe(true);
      expect(mockContract.isNodeRegistered).toHaveBeenCalledWith(mockPublicKey);
    });

    it('should return false when node is not registered', async () => {
      const mockPublicKey = '0x1234';
      (mockBLSService.getPublicKey as jest.Mock).mockReturnValue(mockPublicKey);
      (mockContract.isNodeRegistered as unknown as jest.Mock).mockResolvedValue(false);

      const result = await nodeService.getNodeStatus();
      expect(result).toBe(false);
    });

    it('should handle errors', async () => {
      (mockBLSService.getPublicKey as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to get public key');
      });

      await expect(nodeService.getNodeStatus()).rejects.toThrow('Failed to get public key');
    });
  });

  describe('registerNode', () => {
    it('should register node successfully', async () => {
      const mockPublicKey = '0x1234';
      const mockTxHash = '0xabcd';
      const mockTx = { wait: jest.fn().mockResolvedValue({ hash: mockTxHash }) };

      (mockBLSService.getPublicKey as jest.Mock).mockReturnValue(mockPublicKey);
      (mockContract.registerNode as unknown as jest.Mock).mockResolvedValue(mockTx);

      const result = await nodeService.registerNode();

      expect(result).toBe(mockTxHash);
      expect(mockBLSService.getPublicKey).toHaveBeenCalled();
      expect(mockContract.registerNode).toHaveBeenCalledWith(mockPublicKey);
      expect(mockTx.wait).toHaveBeenCalled();
    });

    it('should handle registration failure', async () => {
      (mockBLSService.getPublicKey as jest.Mock).mockImplementation(() => {
        throw new Error('Failed to get public key');
      });

      await expect(nodeService.registerNode()).rejects.toThrow('Failed to get public key');
    });

    it('should handle transaction failure', async () => {
      const mockPublicKey = '0x1234';
      (mockBLSService.getPublicKey as jest.Mock).mockReturnValue(mockPublicKey);
      (mockContract.registerNode as unknown as jest.Mock).mockRejectedValue(
        new Error('Transaction failed')
      );

      await expect(nodeService.registerNode()).rejects.toThrow('Transaction failed');
    });
  });

  describe('removeNode', () => {
    it('should successfully remove a node', async () => {
      const nodeId = 'test-node';
      const mockTx = { wait: jest.fn().mockResolvedValue(undefined) };
      (mockContract.deactivateNode as unknown as jest.Mock).mockResolvedValue(mockTx);

      await nodeService.removeNode(nodeId);

      expect(mockContract.deactivateNode).toHaveBeenCalledWith(nodeId);
      expect(mockTx.wait).toHaveBeenCalled();
    });

    it('should handle transaction failure', async () => {
      const nodeId = 'test-node';
      (mockContract.deactivateNode as unknown as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

      await expect(nodeService.removeNode(nodeId)).rejects.toThrow('Transaction failed');
    });

    it('should remove node from local storage', async () => {
      const nodeId = 'test-node';
      const mockTx = { wait: jest.fn().mockResolvedValue(undefined) };
      (mockContract.deactivateNode as unknown as jest.Mock).mockResolvedValue(mockTx);

      // Add a node first
      const testNode: NodeInfo = {
        nodeId,
        publicKey: 'test-public-key',
        url: 'http://localhost:3001'
      };
      nodeService.addNode(testNode);

      // Verify node was added
      expect(nodeService.getAllNodes()).toHaveLength(1);

      // Remove the node
      await nodeService.removeNode(nodeId);

      // Verify node was removed
      expect(nodeService.getAllNodes()).toHaveLength(0);
    });
  });

  describe('initialize', () => {
    it('should initialize node service successfully', async () => {
      const mockActiveNodes = {
        nodeIds: ['node1', 'node2'],
        publicKeys: ['0x123', '0x456'],
        urls: ['http://node1', 'http://node2']
      };

      (mockContract.getActiveNodes as unknown as jest.Mock).mockResolvedValue(mockActiveNodes);

      await nodeService.initialize();

      const nodes = nodeService.getAllNodes();
      expect(nodes).toHaveLength(2);
      expect(nodes[0]).toEqual({
        nodeId: 'node1',
        publicKey: '0x123',
        url: 'http://node1'
      });
      expect(nodes[1]).toEqual({
        nodeId: 'node2',
        publicKey: '0x456',
        url: 'http://node2'
      });
    });

    it('should handle initialization errors', async () => {
      (mockContract.getActiveNodes as unknown as jest.Mock).mockRejectedValue(new Error('Failed to get nodes'));

      await expect(nodeService.initialize()).rejects.toThrow('Failed to get nodes');
    });

    it('should not initialize twice', async () => {
      const mockActiveNodes = {
        nodeIds: ['node1'],
        publicKeys: ['0x123'],
        urls: ['http://node1']
      };

      (mockContract.getActiveNodes as unknown as jest.Mock).mockResolvedValue(mockActiveNodes);

      // First initialization
      await nodeService.initialize();
      expect(mockContract.getActiveNodes).toHaveBeenCalledTimes(1);

      // Second initialization should not call getActiveNodes again
      await nodeService.initialize();
      expect(mockContract.getActiveNodes).toHaveBeenCalledTimes(1);
    });
  });

  describe('requestSignaturesFromNodes', () => {
    const testRequest = {
      messageHash: 'test-hash',
      userId: 'test-user'
    };

    beforeEach(async () => {
      // Initialize with some test nodes
      const mockActiveNodes = {
        nodeIds: ['node1', 'node2'],
        publicKeys: ['0x123', '0x456'],
        urls: ['http://node1', 'http://node2']
      };
      (mockContract.getActiveNodes as unknown as jest.Mock).mockResolvedValue(mockActiveNodes);
      await nodeService.initialize();
    });

    it('should collect signatures from all nodes', async () => {
      const mockSignature = '0x789';
      (mockBLSService.sign as jest.Mock).mockResolvedValue(mockSignature);
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ signature: mockSignature })
      });

      const signatures = await nodeService.requestSignaturesFromNodes(testRequest);

      expect(signatures).toHaveLength(2); // 2 nodes
      expect(signatures[0].signature).toBe(mockSignature);
      expect(signatures[1].signature).toBe(mockSignature);
    });

    it('should handle node failure gracefully', async () => {
      const mockSignature = '0x789';
      (mockBLSService.sign as jest.Mock).mockResolvedValue(mockSignature);
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));

      const signatures = await nodeService.requestSignaturesFromNodes(testRequest);

      expect(signatures).toHaveLength(2); // Still returns all nodes, but with failed signatures
      expect(signatures[0].signature).toBeUndefined();
      expect(signatures[1].signature).toBeUndefined();
    });

    it('should handle empty node list', async () => {
      nodeService['nodes'].clear();
      const signatures = await nodeService.requestSignaturesFromNodes(testRequest);
      expect(signatures).toHaveLength(0);
    });
  });

  describe('node management', () => {
    const testNode: NodeInfo = {
      nodeId: 'test-node-1',
      publicKey: 'test-public-key',
      url: 'http://localhost:3001'
    };

    it('should add and get node', () => {
      nodeService.addNode(testNode);
      const node = nodeService.getNode(testNode.nodeId);
      expect(node).toEqual(testNode);
    });

    it('should return undefined for non-existent node', () => {
      const node = nodeService.getNode('non-existent');
      expect(node).toBeUndefined();
    });

    it('should get all nodes', () => {
      const testNode2 = { ...testNode, nodeId: 'test-node-2' };
      nodeService.addNode(testNode);
      nodeService.addNode(testNode2);

      const nodes = nodeService.getAllNodes();
      expect(nodes).toHaveLength(2);
      expect(nodes).toContainEqual(testNode);
      expect(nodes).toContainEqual(testNode2);
    });

    it('should update existing node', () => {
      nodeService.addNode(testNode);
      const updatedNode = { ...testNode, url: 'http://localhost:3002' };
      nodeService.addNode(updatedNode);

      const nodes = nodeService.getAllNodes();
      expect(nodes).toHaveLength(1);
      expect(nodes[0]).toEqual(updatedNode);
    });
  });
}); 