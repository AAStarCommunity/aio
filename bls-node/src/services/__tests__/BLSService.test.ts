import { BLSService } from '../BLSService';
import { ethers } from 'ethers';

describe('BLSService', () => {
  let blsService: BLSService;
  const testMessage = 'Hello, BLS!';

  beforeAll(() => {
    // 使用测试密钥
    process.env.BLS_PRIVATE_KEY = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    process.env.BLS_PUBLIC_KEY = '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    process.env.ETH_RPC_URL = 'https://sepolia.infura.io/v3/test';
    process.env.CHAIN_ID = '11155111';
    
    blsService = new BLSService();
  });

  describe('sign', () => {
    it('should sign a message', async () => {
      const signature = await blsService.sign(testMessage);
      expect(signature).toBeDefined();
      expect(typeof signature).toBe('string');
      expect(signature.startsWith('0x')).toBe(true);
    });
  });

  describe('verify', () => {
    it('should verify a valid signature', async () => {
      const signature = await blsService.sign(testMessage);
      const publicKey = blsService.getPublicKey();
      const isValid = await blsService.verify(testMessage, signature, publicKey);
      expect(isValid).toBe(true);
    });

    it('should reject an invalid signature', async () => {
      const invalidSignature = '0x' + '1'.repeat(128);
      const publicKey = blsService.getPublicKey();
      const isValid = await blsService.verify(testMessage, invalidSignature, publicKey);
      expect(isValid).toBe(false);
    });
  });

  describe('aggregateSignatures', () => {
    it('should aggregate multiple signatures', async () => {
      const signatures = await Promise.all([
        blsService.sign(testMessage + '1'),
        blsService.sign(testMessage + '2'),
        blsService.sign(testMessage + '3')
      ]);

      const aggregatedSignature = await blsService.aggregateSignatures(signatures);
      expect(aggregatedSignature).toBeDefined();
      expect(typeof aggregatedSignature).toBe('string');
      expect(aggregatedSignature.startsWith('0x')).toBe(true);
    });
  });

  describe('getPublicKey', () => {
    it('should return the public key', () => {
      const publicKey = blsService.getPublicKey();
      expect(publicKey).toBeDefined();
      expect(typeof publicKey).toBe('string');
      expect(publicKey.startsWith('0x')).toBe(true);
    });
  });
}); 