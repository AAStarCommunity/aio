/// <reference types="jest" />

import { UserOperationService } from '../services/userOperation.service';
import { BundlerService } from '../services/bundler.service';
import { ethers } from 'ethers';

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock BundlerService
jest.mock('../services/bundler.service');

describe('UserOperationService', () => {
  let service: UserOperationService;
  let mockBundlerService: jest.Mocked<BundlerService>;

  beforeEach(() => {
    mockBundlerService = new BundlerService() as jest.Mocked<BundlerService>;
    service = new UserOperationService(mockBundlerService);
    jest.clearAllMocks();
  });

  describe('createUserOperation', () => {
    const mockTo = '0x123';
    const mockValue = '0x0';
    const mockData = '0x456';

    it('should create a user operation successfully', async () => {
      const mockNonce = '0x1';
      const mockGasLimits = {
        callGasLimit: '0x5000',
        verificationGasLimit: '0x5000',
        preVerificationGas: '0x5000'
      };
      const mockGasFees = {
        maxFeePerGas: '0x1000',
        maxPriorityFeePerGas: '0x100'
      };

      mockBundlerService.getNonce = jest.fn().mockResolvedValue(mockNonce);
      mockBundlerService.estimateUserOperationGas = jest.fn().mockResolvedValue(mockGasLimits);
      mockBundlerService.getGasFees = jest.fn().mockResolvedValue(mockGasFees);

      const result = await service.createUserOperation(mockTo, mockValue, mockData);

      expect(result).toMatchObject({
        nonce: mockNonce,
        callGasLimit: mockGasLimits.callGasLimit,
        verificationGasLimit: mockGasLimits.verificationGasLimit,
        preVerificationGas: mockGasLimits.preVerificationGas,
        maxFeePerGas: mockGasFees.maxFeePerGas,
        maxPriorityFeePerGas: mockGasFees.maxPriorityFeePerGas
      });
    });

    it('should handle errors during user operation creation', async () => {
      const error = new Error('Failed to get nonce');
      mockBundlerService.getNonce = jest.fn().mockRejectedValue(error);

      await expect(service.createUserOperation(mockTo, mockValue, mockData))
        .rejects
        .toThrow('Failed to get nonce');
    });
  });

  describe('sendUserOperation', () => {
    const mockUserOp = {
      sender: '0x123',
      nonce: 0n,
      initCode: '0x',
      callData: '0x123',
      callGasLimit: 0x5000n,
      verificationGasLimit: 0x5000n,
      preVerificationGas: 0x5000n,
      maxFeePerGas: 0x5000n,
      maxPriorityFeePerGas: 0x5000n,
      paymasterAndData: '0x',
      signature: '0x'
    };

    it('should send a user operation successfully', async () => {
      const mockOpHash = '0x123hash';
      mockBundlerService.sendUserOperation = jest.fn().mockResolvedValue(mockOpHash);

      const result = await service.sendUserOperation(mockUserOp);

      expect(mockBundlerService.sendUserOperation).toHaveBeenCalledWith(mockUserOp);
      expect(result).toBe(mockOpHash);
    });

    it('should handle errors during user operation sending', async () => {
      const error = new Error('Failed to send user operation');
      mockBundlerService.sendUserOperation = jest.fn().mockRejectedValue(error);

      await expect(service.sendUserOperation(mockUserOp))
        .rejects
        .toThrow('Failed to send user operation');
    });
  });
}); 