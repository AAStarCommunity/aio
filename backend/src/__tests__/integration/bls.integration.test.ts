import axios from 'axios';
import { ethers } from 'ethers';
import { config } from '../../config';

describe('BLS Node Integration Tests', () => {
  const BLS_NODE_URL = process.env.BLS_NODE_URL || 'http://localhost:3001';
  
  // 测试数据
  const testUserOp = {
    sender: '0x1234567890123456789012345678901234567890',
    nonce: '0x0',
    initCode: '0x',
    callData: '0x',
    callGasLimit: '0x0',
    verificationGasLimit: '0x0',
    preVerificationGas: '0x0',
    maxFeePerGas: '0x0',
    maxPriorityFeePerGas: '0x0',
    paymasterAndData: '0x',
    signature: '0x'
  };

  // 在所有测试开始前检查BLS节点是否在线
  beforeAll(async () => {
    try {
      await axios.get(`${BLS_NODE_URL}/health`);
    } catch (error) {
      console.error('BLS node is not running. Please start the BLS node first.');
      throw error;
    }
  });

  describe('BLS Node Health Check', () => {
    it('should return healthy status', async () => {
      const response = await axios.get(`${BLS_NODE_URL}/health`);
      expect(response.status).toBe(200);
      expect(response.data.status).toBe('healthy');
    });
  });

  describe('BLS Signature Generation', () => {
    it('should generate valid BLS signature for UserOperation', async () => {
      // 1. 计算UserOperation的哈希
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const encodedData = abiCoder.encode(
        ['address', 'uint256', 'bytes', 'bytes', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes', 'bytes'],
        [
          testUserOp.sender,
          testUserOp.nonce,
          testUserOp.initCode,
          testUserOp.callData,
          testUserOp.callGasLimit,
          testUserOp.verificationGasLimit,
          testUserOp.preVerificationGas,
          testUserOp.maxFeePerGas,
          testUserOp.maxPriorityFeePerGas,
          testUserOp.paymasterAndData,
          testUserOp.signature
        ]
      );
      const userOpHash = ethers.keccak256(encodedData);

      // 2. 发送到BLS节点进行签名
      const response = await axios.post(`${BLS_NODE_URL}/sign`, {
        messageHash: userOpHash
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('signature');
      expect(typeof response.data.signature).toBe('string');
      expect(response.data.signature).toMatch(/^0x[0-9a-fA-F]+$/);
    });

    it('should verify BLS signature correctly', async () => {
      // 1. 获取签名
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const encodedData = abiCoder.encode(
        ['address', 'uint256', 'bytes', 'bytes', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes', 'bytes'],
        [
          testUserOp.sender,
          testUserOp.nonce,
          testUserOp.initCode,
          testUserOp.callData,
          testUserOp.callGasLimit,
          testUserOp.verificationGasLimit,
          testUserOp.preVerificationGas,
          testUserOp.maxFeePerGas,
          testUserOp.maxPriorityFeePerGas,
          testUserOp.paymasterAndData,
          testUserOp.signature
        ]
      );
      const userOpHash = ethers.keccak256(encodedData);

      // 2. 获取签名
      const signResponse = await axios.post(`${BLS_NODE_URL}/sign`, {
        messageHash: userOpHash
      });

      // 3. 验证签名
      const verifyResponse = await axios.post(`${BLS_NODE_URL}/verify`, {
        messageHash: userOpHash,
        signature: signResponse.data.signature
      });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.data.isValid).toBe(true);
    });
  });

  describe('BLS Node Error Handling', () => {
    it('should handle invalid message hash', async () => {
      await expect(
        axios.post(`${BLS_NODE_URL}/sign`, {
          messageHash: 'invalid_hash'
        })
      ).rejects.toThrow();
    });

    it('should handle invalid signature in verification', async () => {
      const abiCoder = ethers.AbiCoder.defaultAbiCoder();
      const encodedData = abiCoder.encode(
        ['address'],
        [testUserOp.sender]
      );
      const userOpHash = ethers.keccak256(encodedData);

      const response = await axios.post(`${BLS_NODE_URL}/verify`, {
        messageHash: userOpHash,
        signature: '0x1234'  // 无效签名
      });

      expect(response.status).toBe(200);
      expect(response.data.isValid).toBe(false);
    });
  });

  describe('BLS Node Performance', () => {
    it('should handle multiple signature requests efficiently', async () => {
      const requests = Array(5).fill(null).map(() => {
        const randomBytes = ethers.randomBytes(32);
        const randomHash = ethers.keccak256(randomBytes);
        return axios.post(`${BLS_NODE_URL}/sign`, {
          messageHash: randomHash
        });
      });

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const endTime = Date.now();

      // 检查所有请求是否成功
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('signature');
      });

      // 检查总时间是否在合理范围内（假设每个请求应该在1秒内完成）
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });
}); 