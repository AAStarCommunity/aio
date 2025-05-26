import { BLSService } from '../blsService';
import { mock } from 'jest-mock-extended';
import { bls12_381 as bls } from '@noble/curves/bls12-381';
import { ethers } from 'ethers';
import logger from '../../utils/logger';

// Mock BLS库
jest.mock('@noble/curves/bls12-381', () => ({
  bls12_381: {
    getPublicKey: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
    aggregatePublicKeys: jest.fn(),
    aggregateSignatures: jest.fn()
  }
}));

describe('BLSService', () => {
  let blsService: BLSService;
  let originalLogLevel: string;
  const mockPrivateKey = Buffer.from('mock-private-key');
  const mockMessage = 'test-message';
  const mockSignature = '0x123456';
  const mockPublicKey = '0x789abc';

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
    blsService = new BLSService(mockPrivateKey);
    jest.clearAllMocks();
  });

  describe('getPublicKey', () => {
    it('should return public key successfully', () => {
      (bls.getPublicKey as jest.Mock).mockReturnValue(ethers.getBytes(mockPublicKey));

      const result = blsService.getPublicKey();

      expect(result).toEqual(mockPublicKey);
      expect(bls.getPublicKey).toHaveBeenCalledWith(Buffer.from('mock-private-key').toString('hex'));
    });

    it('should handle public key generation error', () => {
      (bls.getPublicKey as jest.Mock).mockImplementation(() => {
        throw new Error('Public key generation failed');
      });

      expect(() => blsService.getPublicKey()).toThrow('Public key generation failed');
    });
  });

  describe('sign', () => {
    it('should sign message successfully', async () => {
      (bls.sign as jest.Mock).mockResolvedValue(ethers.getBytes(mockSignature));

      const result = await blsService.sign(mockMessage);

      expect(result).toEqual(mockSignature);
      expect(bls.sign).toHaveBeenCalledWith(
        ethers.getBytes(ethers.hashMessage(mockMessage)),
        Buffer.from('mock-private-key').toString('hex')
      );
    });

    it('should handle signing error', async () => {
      (bls.sign as jest.Mock).mockRejectedValue(new Error('Signing failed'));

      await expect(blsService.sign(mockMessage)).rejects.toThrow('Signing failed');
    });
  });

  describe('verify', () => {
    it('should verify signature successfully', async () => {
      (bls.verify as jest.Mock).mockResolvedValue(true);

      const result = await blsService.verify(mockMessage, mockSignature, mockPublicKey);

      expect(result).toBeTruthy();
      expect(bls.verify).toHaveBeenCalledWith(
        ethers.getBytes(mockSignature),
        ethers.getBytes(ethers.hashMessage(mockMessage)),
        ethers.getBytes(mockPublicKey)
      );
    });

    it('should return false for invalid signature', async () => {
      (bls.verify as jest.Mock).mockResolvedValue(false);

      const result = await blsService.verify(mockMessage, mockSignature, mockPublicKey);

      expect(result).toBeFalsy();
    });

    it('should handle verification error', async () => {
      (bls.verify as jest.Mock).mockRejectedValue(new Error('Verification failed'));

      await expect(
        blsService.verify(mockMessage, mockSignature, mockPublicKey)
      ).rejects.toThrow('Verification failed');
    });
  });

  describe('aggregatePublicKeys', () => {
    it('should aggregate public keys successfully', () => {
      const mockPublicKeys = [mockPublicKey, mockPublicKey];
      const mockAggregatedKey = '0xdef123';
      
      (bls.aggregatePublicKeys as jest.Mock).mockReturnValue(ethers.getBytes(mockAggregatedKey));

      const result = blsService.aggregatePublicKeys(mockPublicKeys);

      expect(result).toEqual(mockAggregatedKey);
      expect(bls.aggregatePublicKeys).toHaveBeenCalledWith(
        mockPublicKeys.map(pk => ethers.getBytes(pk))
      );
    });

    it('should handle empty public keys array', () => {
      expect(() => blsService.aggregatePublicKeys([])).toThrow('No public keys provided');
    });

    it('should handle aggregation error', () => {
      const mockPublicKeys = [mockPublicKey];
      
      (bls.aggregatePublicKeys as jest.Mock).mockImplementation(() => {
        throw new Error('Aggregation failed');
      });

      expect(() => blsService.aggregatePublicKeys(mockPublicKeys)).toThrow('Aggregation failed');
    });
  });

  describe('aggregateSignatures', () => {
    it('should aggregate signatures successfully', async () => {
      const mockSignatures = [mockSignature, mockSignature];
      const mockAggregatedSignature = '0xdef456';
      
      (bls.aggregateSignatures as jest.Mock).mockResolvedValue(ethers.getBytes(mockAggregatedSignature));

      const result = await blsService.aggregateSignatures(mockSignatures);

      expect(result).toEqual(mockAggregatedSignature);
      expect(bls.aggregateSignatures).toHaveBeenCalledWith(
        mockSignatures.map(sig => ethers.getBytes(sig))
      );
    });

    it('should handle empty signatures array', async () => {
      await expect(blsService.aggregateSignatures([])).rejects.toThrow('No signatures provided');
    });

    it('should handle aggregation error', async () => {
      const mockSignatures = [mockSignature];
      
      (bls.aggregateSignatures as jest.Mock).mockRejectedValue(new Error('Aggregation failed'));

      await expect(blsService.aggregateSignatures(mockSignatures)).rejects.toThrow('Aggregation failed');
    });
  });
}); 