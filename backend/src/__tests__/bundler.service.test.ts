/// <reference types="jest" />

import { BundlerService } from '../services/bundler.service';
import { ethers } from 'ethers';

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock ethers provider
jest.mock('ethers', () => ({
  ...jest.requireActual('ethers'),
  JsonRpcProvider: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  }))
}));

describe('BundlerService', () => {
  let service: BundlerService;
  let mockProvider: jest.Mocked<ethers.JsonRpcProvider>;

  beforeEach(() => {
    mockProvider = new ethers.JsonRpcProvider() as jest.Mocked<ethers.JsonRpcProvider>;
    service = new BundlerService();
    (service as any).provider = mockProvider;
    jest.clearAllMocks();
  });

  describe('getNonce', () => {
    const mockAddress = '0x123';

    it('should get nonce successfully', async () => {
      const mockNonce = '0x1';
      mockProvider.send = jest.fn().mockResolvedValue(mockNonce);

      const result = await service.getNonce(mockAddress);

      expect(mockProvider.send).toHaveBeenCalledWith('eth_getUserOperationNonce', [mockAddress]);
      expect(result).toBe(mockNonce);
    });

    it('should handle errors when getting nonce', async () => {
      const error = new Error('Failed to get nonce');
      mockProvider.send = jest.fn().mockRejectedValue(error);

      await expect(service.getNonce(mockAddress))
        .rejects
        .toThrow('Failed to get nonce');
    });
  });

  describe('estimateUserOperationGas', () => {
    const mockUserOp = {
      sender: '0x123',
      nonce: '0x0',
      initCode: '0x',
      callData: '0x123',
      callGasLimit: '0x0',
      verificationGasLimit: '0x0',
      preVerificationGas: '0x0',
      maxFeePerGas: '0x0',
      maxPriorityFeePerGas: '0x0',
      paymasterAndData: '0x',
      signature: '0x'
    };

    it('should estimate gas successfully', async () => {
      const mockGasEstimates = {
        callGasLimit: '0x5000',
        verificationGasLimit: '0x5000',
        preVerificationGas: '0x5000'
      };

      mockProvider.send = jest.fn().mockResolvedValue(mockGasEstimates);

      const result = await service.estimateUserOperationGas(mockUserOp);

      expect(mockProvider.send).toHaveBeenCalledWith('eth_estimateUserOperationGas', [mockUserOp]);
      expect(result).toEqual(mockGasEstimates);
    });

    it('should handle errors during gas estimation', async () => {
      const error = new Error('Failed to estimate gas');
      mockProvider.send = jest.fn().mockRejectedValue(error);

      await expect(service.estimateUserOperationGas(mockUserOp))
        .rejects
        .toThrow('Failed to estimate gas');
    });
  });

  describe('getGasFees', () => {
    it('should get gas fees successfully', async () => {
      const mockGasFees = {
        maxFeePerGas: '0x1000',
        maxPriorityFeePerGas: '0x100'
      };

      mockProvider.send = jest.fn().mockResolvedValue(mockGasFees);

      const result = await service.getGasFees();

      expect(mockProvider.send).toHaveBeenCalledWith('eth_getGasFees', []);
      expect(result).toEqual(mockGasFees);
    });

    it('should handle errors when getting gas fees', async () => {
      const error = new Error('Failed to get gas fees');
      mockProvider.send = jest.fn().mockRejectedValue(error);

      await expect(service.getGasFees())
        .rejects
        .toThrow('Failed to get gas fees');
    });
  });

  describe('sendUserOperation', () => {
    const mockUserOp = {
      sender: '0x123',
      nonce: '0x0',
      initCode: '0x',
      callData: '0x123',
      callGasLimit: '0x5000',
      verificationGasLimit: '0x5000',
      preVerificationGas: '0x5000',
      maxFeePerGas: '0x5000',
      maxPriorityFeePerGas: '0x5000',
      paymasterAndData: '0x',
      signature: '0x'
    };

    it('should send user operation successfully', async () => {
      const mockOpHash = '0x123hash';
      mockProvider.send = jest.fn().mockResolvedValue(mockOpHash);

      const result = await service.sendUserOperation(mockUserOp);

      expect(mockProvider.send).toHaveBeenCalledWith('eth_sendUserOperation', [mockUserOp]);
      expect(result).toBe(mockOpHash);
    });

    it('should handle errors when sending user operation', async () => {
      const error = new Error('Failed to send user operation');
      mockProvider.send = jest.fn().mockRejectedValue(error);

      await expect(service.sendUserOperation(mockUserOp))
        .rejects
        .toThrow('Failed to send user operation');
    });
  });
}); 