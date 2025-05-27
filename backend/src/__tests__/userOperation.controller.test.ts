/// <reference types="jest" />

import { UserOperationController } from '../controllers/userOperation.controller';
import { UserOperationService } from '../services/userOperation.service';
import { BundlerService } from '../services/bundler.service';
import { Request, Response } from 'express';

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

// Mock UserOperationService
jest.mock('../services/userOperation.service');

describe('UserOperationController', () => {
  let controller: UserOperationController;
  let mockUserOperationService: jest.Mocked<UserOperationService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;
  let mockStatus: jest.Mock;

  beforeEach(() => {
    const mockBundlerService = new BundlerService();
    mockUserOperationService = new UserOperationService(mockBundlerService) as jest.Mocked<UserOperationService>;
    controller = new UserOperationController(mockUserOperationService);

    mockJson = jest.fn();
    mockStatus = jest.fn().mockReturnValue({ json: mockJson });
    mockResponse = {
      status: mockStatus,
      json: mockJson
    };

    jest.clearAllMocks();
  });

  describe('createUserOperation', () => {
    it('should create a user operation successfully', async () => {
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

      mockRequest = {
        body: {
          to: '0x456',
          value: '0x0',
          data: '0x789'
        }
      };

      mockUserOperationService.createUserOperation = jest.fn().mockResolvedValue(mockUserOp);

      await controller.createUserOperation(mockRequest as Request, mockResponse as Response);

      expect(mockUserOperationService.createUserOperation).toHaveBeenCalledWith(
        mockRequest.body.to,
        mockRequest.body.value,
        mockRequest.body.data
      );
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ userOperation: mockUserOp });
    });

    it('should handle errors when creating user operation', async () => {
      const error = new Error('Failed to create user operation');
      mockUserOperationService.createUserOperation = jest.fn().mockRejectedValue(error);

      mockRequest = {
        body: {
          to: '0x456',
          value: '0x0',
          data: '0x789'
        }
      };

      await controller.createUserOperation(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to create user operation' });
    });
  });

  describe('sendUserOperation', () => {
    it('should send a user operation successfully', async () => {
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

      const mockOpHash = '0x123hash';

      mockRequest = {
        body: { userOperation: mockUserOp }
      };

      mockUserOperationService.sendUserOperation = jest.fn().mockResolvedValue(mockOpHash);

      await controller.sendUserOperation(mockRequest as Request, mockResponse as Response);

      expect(mockUserOperationService.sendUserOperation).toHaveBeenCalledWith(mockUserOp);
      expect(mockStatus).toHaveBeenCalledWith(200);
      expect(mockJson).toHaveBeenCalledWith({ userOpHash: mockOpHash });
    });

    it('should handle errors when sending user operation', async () => {
      const error = new Error('Failed to send user operation');
      mockUserOperationService.sendUserOperation = jest.fn().mockRejectedValue(error);

      mockRequest = {
        body: {
          userOperation: {}
        }
      };

      await controller.sendUserOperation(mockRequest as Request, mockResponse as Response);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ error: 'Failed to send user operation' });
    });
  });
}); 