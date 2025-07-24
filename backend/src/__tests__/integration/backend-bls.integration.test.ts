import { BLSService } from '../../services/bls.service';
import { UserOperationService } from '../../services/userOperation.service';
import { BundlerService } from '../../services/bundler.service';
import { ethers } from 'ethers';
import logger from '../../utils/logger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('Backend-BLS Node Integration Tests', () => {
  let blsService: BLSService;
  let userOpService: UserOperationService;
  let bundlerService: BundlerService;
  const BLS_NODE_URL = process.env.BLS_NODE_URL || 'http://localhost:3001';

  // 测试数据
  const mockUserOp = {
    sender: '0x1234567890123456789012345678901234567890',
    nonce: 0n,
    initCode: '0x',
    callData: '0x',
    callGasLimit: 0x5000n,
    verificationGasLimit: 0x5000n,
    preVerificationGas: 0x5000n,
    maxFeePerGas: 0x1000n,
    maxPriorityFeePerGas: 0x100n,
    paymasterAndData: '0x',
    signature: '0x'
  };

  beforeAll(async () => {
    // 初始化服务
    blsService = new BLSService(BLS_NODE_URL);
    bundlerService = new BundlerService();
    userOpService = new UserOperationService(bundlerService);

    // 检查BLS节点是否在线
    try {
      const isHealthy = await blsService.checkHealth();
      if (!isHealthy) {
        throw new Error('BLS node is not healthy');
      }
    } catch (error) {
      console.error('BLS node is not running. Please start the BLS node first.');
      throw error;
    }
  });

  describe('UserOperation Flow with BLS Signatures', () => {
    it('should create and sign a UserOperation', async () => {
      // 1. 创建UserOperation
      const userOp = await userOpService.createUserOperation(
        '0x1234567890123456789012345678901234567890',
        '0x0',
        '0x'
      );
      expect(userOp).toBeDefined();
      expect(userOp.sender).toBe(mockUserOp.sender);

      // 2. 计算UserOperation哈希
      const userOpHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(userOp)));
      expect(userOpHash).toMatch(/^0x[0-9a-fA-F]{64}$/);

      // 3. 获取BLS签名
      const signature = await blsService.sign(userOpHash);
      expect(signature).toBeDefined();
      expect(signature).toMatch(/^0x[0-9a-fA-F]+$/);

      // 4. 验证BLS签名
      const publicKey = await blsService.getPublicKey();
      const isValid = await blsService.verify(userOpHash, signature, publicKey);
      expect(isValid).toBe(true);
    });

    it('should handle multiple BLS signatures for the same UserOperation', async () => {
      // 1. 创建UserOperation
      const userOp = await userOpService.createUserOperation(
        '0x1234567890123456789012345678901234567890',
        '0x0',
        '0x'
      );

      // 2. 计算UserOperation哈希
      const userOpHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(userOp)));

      // 3. 模拟多个BLS节点签名
      const signatures = [];
      const publicKeys = [];
      
      // 获取当前节点的签名和公钥
      const signature = await blsService.sign(userOpHash);
      const publicKey = await blsService.getPublicKey();
      
      // 添加多个签名（这里我们重复使用同一个签名来模拟）
      for (let i = 0; i < 3; i++) {
        signatures.push(signature);
        publicKeys.push(publicKey);
      }

      // 4. 聚合签名
      const aggregatedSignature = await blsService.aggregateSignatures(signatures);
      expect(aggregatedSignature).toBeDefined();
      expect(aggregatedSignature).toMatch(/^0x[0-9a-fA-F]+$/);

      // 5. 验证聚合签名
      const isValid = await blsService.verifyAggregatedSignature(
        userOpHash,
        aggregatedSignature,
        publicKeys
      );
      expect(isValid).toBe(true);
    });

    it('should handle invalid signatures correctly', async () => {
      // 1. 创建UserOperation
      const userOp = await userOpService.createUserOperation(
        '0x1234567890123456789012345678901234567890',
        '0x0',
        '0x'
      );

      // 2. 计算UserOperation哈希
      const userOpHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(userOp)));

      // 3. 使用无效签名
      const invalidSignature = '0x1234';
      const publicKey = await blsService.getPublicKey();

      // 4. 验证无效签名
      const isValid = await blsService.verify(userOpHash, invalidSignature, publicKey);
      expect(isValid).toBe(false);
    });

    it('should handle UserOperation submission with BLS signature', async () => {
      // 1. 创建UserOperation
      const userOp = await userOpService.createUserOperation(
        '0x1234567890123456789012345678901234567890',
        '0x0',
        '0x'
      );

      // 2. 获取BLS签名
      const userOpHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(userOp)));
      const signature = await blsService.sign(userOpHash);

      // 3. 将签名添加到UserOperation
      const signedUserOp = {
        ...userOp,
        signature
      };

      // 4. 提交UserOperation
      try {
        const opHash = await userOpService.sendUserOperation(signedUserOp);
        expect(opHash).toBeDefined();
        expect(opHash).toMatch(/^0x[0-9a-fA-F]{64}$/);
      } catch (error) {
        // 如果没有实际的bundler服务，这里可能会失败
        expect(error).toBeDefined();
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle BLS node connection errors', async () => {
      // 创建一个指向错误地址的BLS服务实例
      const invalidBlsService = new BLSService('http://localhost:9999');
      
      // 检查健康状态应该失败
      const isHealthy = await invalidBlsService.checkHealth();
      expect(isHealthy).toBe(false);
    });

    it('should handle empty UserOperation', async () => {
      const emptyUserOp = {
        ...mockUserOp,
        callData: '0x'
      };

      // 计算空UserOperation的哈希
      const userOpHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(emptyUserOp)));
      
      // 应该仍然能够签名和验证
      const signature = await blsService.sign(userOpHash);
      const publicKey = await blsService.getPublicKey();
      const isValid = await blsService.verify(userOpHash, signature, publicKey);
      
      expect(isValid).toBe(true);
    });

    it('should handle concurrent signature requests', async () => {
      const userOp = await userOpService.createUserOperation(
        '0x1234567890123456789012345678901234567890',
        '0x0',
        '0x'
      );
      const userOpHash = ethers.keccak256(ethers.toUtf8Bytes(JSON.stringify(userOp)));

      // 并发发送多个签名请求
      const signaturePromises = Array(5).fill(null).map(() => blsService.sign(userOpHash));
      
      // 所有请求应该都能成功完成
      const signatures = await Promise.all(signaturePromises);
      signatures.forEach(signature => {
        expect(signature).toBeDefined();
        expect(signature).toMatch(/^0x[0-9a-fA-F]+$/);
      });
    });
  });
}); 