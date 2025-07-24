import axios from 'axios';
import { ethers } from 'ethers';
import { config } from '../../config';

describe('BLS Node Integration Tests', () => {
  const BLS_NODE_URL = process.env.BLS_NODE_URL || 'http://localhost:3001';
  const BLS_API_BASE = `${BLS_NODE_URL}/api/bls`;
  
  // 测试数据
  const testUserOp = {
    sender: '0x1234567890123456789012345678901234567890',
    nonce: 0n,
    initCode: '0x',
    callData: '0x',
    callGasLimit: 0n,
    verificationGasLimit: 0n,
    preVerificationGas: 0n,
    maxFeePerGas: 0n,
    maxPriorityFeePerGas: 0n,
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
      expect(response.data.status).toBe('ok');
    });
  });

  describe('BLS Signature Generation', () => {
    it('should generate valid BLS signature for UserOperation', async () => {
      // 1. 准备消息
      const message = 'Hello, this is a test message!';
      
      // 2. 发送到BLS节点进行签名
      const response = await axios.post(`${BLS_API_BASE}/sign`, {
        message
      });

      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('signature');
      expect(typeof response.data.signature).toBe('string');
      expect(response.data.signature).toMatch(/^0x[0-9a-fA-F]+$/);
    });

    it('should verify BLS signature correctly', async () => {
      // 1. 准备消息
      const message = 'Hello, this is another test message!';
      
      // 2. 获取签名
      const signResponse = await axios.post(`${BLS_API_BASE}/sign`, {
        message
      });

      // 3. 获取公钥
      const publicKeyResponse = await axios.get(`${BLS_API_BASE}/public-key`);

      // 4. 验证签名
      const verifyResponse = await axios.post(`${BLS_API_BASE}/verify`, {
        message,
        signature: signResponse.data.signature,
        publicKey: publicKeyResponse.data.publicKey
      });

      expect(verifyResponse.status).toBe(200);
      expect(verifyResponse.data.valid).toBe(true);
    });
  });

  describe('BLS Node Error Handling', () => {
    it('should handle invalid message hash', async () => {
      await expect(
        axios.post(`${BLS_API_BASE}/sign`, {
          message: ''
        })
      ).rejects.toThrow();
    });

    it('should handle invalid signature in verification', async () => {
      const message = 'Test message for invalid signature';
      const publicKeyResponse = await axios.get(`${BLS_API_BASE}/public-key`);

      const response = await axios.post(`${BLS_API_BASE}/verify`, {
        message,
        signature: '0x1234',  // 无效签名
        publicKey: publicKeyResponse.data.publicKey
      });

      expect(response.status).toBe(200);
      expect(response.data.valid).toBe(false);
    });
  });

  describe('BLS Node Performance', () => {
    it('should handle multiple signature requests efficiently', async () => {
      const requests = Array(5).fill(null).map((_, index) => {
        const message = `Test message ${index}`;
        return axios.post(`${BLS_API_BASE}/sign`, {
          message
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