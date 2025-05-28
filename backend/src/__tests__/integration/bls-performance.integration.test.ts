import { BLSService } from '../../services/bls.service';
import { ethers } from 'ethers';
import logger from '../../utils/logger';

// Mock logger
jest.mock('../../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

describe('BLS Node Performance Tests', () => {
  let blsService: BLSService;
  const BLS_NODE_URL = process.env.BLS_NODE_URL || 'http://localhost:3001';

  beforeAll(async () => {
    blsService = new BLSService(BLS_NODE_URL);
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

  describe('Performance Tests', () => {
    it('should handle high volume of signature requests', async () => {
      const numRequests = 50;
      const messages = Array(numRequests).fill(null).map((_, i) => 
        ethers.keccak256(ethers.toUtf8Bytes(`Test message ${i}`))
      );

      const startTime = Date.now();
      
      // 并发发送签名请求
      const signaturePromises = messages.map(msg => blsService.sign(msg));
      const signatures = await Promise.all(signaturePromises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const averageTime = totalTime / numRequests;

      // 验证所有签名
      const publicKey = await blsService.getPublicKey();
      const verificationPromises = signatures.map((sig, i) => 
        blsService.verify(messages[i], sig, publicKey)
      );
      const verificationResults = await Promise.all(verificationPromises);

      // 检查结果
      expect(signatures).toHaveLength(numRequests);
      expect(verificationResults.every(result => result === true)).toBe(true);
      expect(averageTime).toBeLessThan(100); // 每个请求平均耗时应小于100ms
    });

    it('should handle large signature aggregation efficiently', async () => {
      const numSignatures = 20;
      const message = ethers.keccak256(ethers.toUtf8Bytes('Test message for aggregation'));
      
      // 生成多个签名
      const signature = await blsService.sign(message);
      const signatures = Array(numSignatures).fill(signature);
      
      const startTime = Date.now();
      
      // 聚合签名
      const aggregatedSignature = await blsService.aggregateSignatures(signatures);
      
      const endTime = Date.now();
      const aggregationTime = endTime - startTime;

      // 验证聚合签名
      const publicKey = await blsService.getPublicKey();
      const publicKeys = Array(numSignatures).fill(publicKey);
      const isValid = await blsService.verifyAggregatedSignature(
        message,
        aggregatedSignature,
        publicKeys
      );

      expect(aggregationTime).toBeLessThan(1000); // 聚合时间应小于1秒
      expect(isValid).toBe(true);
    });

    it('should maintain performance under sustained load', async () => {
      const numRounds = 5;
      const requestsPerRound = 10;
      const results = [];

      for (let round = 0; round < numRounds; round++) {
        const startTime = Date.now();
        
        // 每轮发送多个签名请求
        const messages = Array(requestsPerRound).fill(null).map((_, i) => 
          ethers.keccak256(ethers.toUtf8Bytes(`Round ${round} Message ${i}`))
        );
        
        const signaturePromises = messages.map(msg => blsService.sign(msg));
        const signatures = await Promise.all(signaturePromises);
        
        const endTime = Date.now();
        results.push({
          round,
          time: endTime - startTime,
          signatures: signatures.length
        });

        // 短暂暂停，模拟实际使用场景
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 分析性能结果
      const averageTime = results.reduce((sum, r) => sum + r.time, 0) / results.length;
      const maxTime = Math.max(...results.map(r => r.time));
      const minTime = Math.min(...results.map(r => r.time));

      expect(averageTime).toBeLessThan(1000); // 平均时间应小于1秒
      expect(maxTime - minTime).toBeLessThan(500); // 最大和最小时间差应小于500ms
    });
  });

  describe('Stability Tests', () => {
    it('should handle repeated connections and disconnections', async () => {
      const numAttempts = 10;
      let successfulConnections = 0;

      for (let i = 0; i < numAttempts; i++) {
        try {
          const newBlsService = new BLSService(BLS_NODE_URL);
          const isHealthy = await newBlsService.checkHealth();
          if (isHealthy) {
            successfulConnections++;
          }
        } catch (error) {
          logger.error(`Connection attempt ${i + 1} failed:`, error);
        }
      }

      expect(successfulConnections).toBe(numAttempts);
    });

    it('should recover from failed requests', async () => {
      const message = ethers.keccak256(ethers.toUtf8Bytes('Test message'));
      
      // 创建一个指向错误地址的服务实例
      const invalidBlsService = new BLSService('http://localhost:9999');
      
      // 首先尝试失败的请求
      try {
        await invalidBlsService.sign(message);
      } catch (error) {
        expect(error).toBeDefined();
      }

      // 然后使用正确的服务实例
      const signature = await blsService.sign(message);
      expect(signature).toBeDefined();
      expect(signature).toMatch(/^0x[0-9a-fA-F]+$/);
    });

    it('should handle network latency simulation', async () => {
      const message = ethers.keccak256(ethers.toUtf8Bytes('Test message'));
      
      // 模拟网络延迟
      const withDelay = async (promise: Promise<any>, delay: number) => {
        await new Promise(resolve => setTimeout(resolve, delay));
        return promise;
      };

      const delays = [100, 200, 300, 400, 500];
      const results = await Promise.all(
        delays.map(delay => withDelay(blsService.sign(message), delay))
      );

      results.forEach(signature => {
        expect(signature).toBeDefined();
        expect(signature).toMatch(/^0x[0-9a-fA-F]+$/);
      });
    });
  });
}); 