import { BLSService } from '../services/bls.service';
import axios from 'axios';
import { UserOperation } from '../types/userOperation.type';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('BLSService', () => {
  let blsService: BLSService;
  const testNodeUrl = 'http://test-bls-node:3001';

  beforeEach(() => {
    blsService = new BLSService(testNodeUrl);
    jest.clearAllMocks();
  });

  const mockUserOp: UserOperation = {
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

  describe('checkHealth', () => {
    it('should return true when node is healthy', async () => {
      mockedAxios.get.mockResolvedValueOnce({ data: { status: 'healthy' } });
      const result = await blsService.checkHealth();
      expect(result).toBe(true);
      expect(mockedAxios.get).toHaveBeenCalledWith(`${testNodeUrl}/health`);
    });

    it('should return false when node is unhealthy', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Connection failed'));
      const result = await blsService.checkHealth();
      expect(result).toBe(false);
    });
  });

  describe('sign', () => {
    it('should return signature when signing is successful', async () => {
      const mockSignature = '0x1234';
      mockedAxios.post.mockResolvedValueOnce({ data: { signature: mockSignature } });
      
      const messageHash = '0xabcd';
      const result = await blsService.sign(messageHash);
      
      expect(result).toBe(mockSignature);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${testNodeUrl}/sign`,
        { messageHash }
      );
    });

    it('should throw error when signing fails', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Signing failed'));
      
      await expect(blsService.sign('0xabcd'))
        .rejects
        .toThrow('Failed to get BLS signature');
    });
  });

  describe('verify', () => {
    it('should return true for valid signature', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { isValid: true } });
      
      const messageHash = '0xabcd';
      const signature = '0x1234';
      const result = await blsService.verify(messageHash, signature);
      
      expect(result).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledWith(
        `${testNodeUrl}/verify`,
        { messageHash, signature }
      );
    });

    it('should return false for invalid signature', async () => {
      mockedAxios.post.mockResolvedValueOnce({ data: { isValid: false } });
      
      const result = await blsService.verify('0xabcd', '0x1234');
      expect(result).toBe(false);
    });
  });

  describe('UserOperation signing and verification', () => {
    it('should successfully sign and verify a UserOperation', async () => {
      const mockSignature = '0x1234';
      mockedAxios.post
        .mockResolvedValueOnce({ data: { signature: mockSignature } })  // sign
        .mockResolvedValueOnce({ data: { isValid: true } });           // verify
      
      const signature = await blsService.signUserOperation(mockUserOp);
      expect(signature).toBe(mockSignature);
      
      const isValid = await blsService.verifyUserOperationSignature(mockUserOp, signature);
      expect(isValid).toBe(true);
    });

    it('should calculate consistent UserOperation hash', () => {
      const hash1 = blsService.calculateUserOpHash(mockUserOp);
      const hash2 = blsService.calculateUserOpHash(mockUserOp);
      
      expect(hash1).toBe(hash2);
      expect(hash1).toMatch(/^0x[0-9a-fA-F]{64}$/);
    });
  });
}); 