import { Request, Response } from 'express';
import { BLSController } from '../BLSController';
import { BLSService } from '../../services/blsService';
import { mock } from 'jest-mock-extended';
import logger from '../../utils/logger';

jest.mock('../../services/blsService');
jest.mock('../../utils/logger');

describe('BLSController', () => {
  let blsController: BLSController;
  let mockBLSService: jest.Mocked<BLSService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockLogger: jest.Mocked<typeof logger>;

  beforeEach(() => {
    mockBLSService = mock<BLSService>();
    mockLogger = logger as jest.Mocked<typeof logger>;
    blsController = new BLSController();
    // @ts-ignore - 替换私有属性
    blsController.blsService = mockBLSService;

    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // 清除所有模拟
    jest.clearAllMocks();
  });

  describe('sign', () => {
    it('should sign message successfully', async () => {
      const message = 'test message';
      const signature = '0x1234';
      mockRequest = {
        body: { message }
      };

      mockBLSService.sign.mockResolvedValue(signature);

      await blsController.sign(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockBLSService.sign).toHaveBeenCalledWith(message);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ signature });
    });

    it('should handle missing message', async () => {
      mockRequest = {
        body: {}
      };

      await blsController.sign(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        error: 'Message is required' 
      });
    });

    it('should handle signing error', async () => {
      const errorMessage = 'Signing failed';
      mockRequest = {
        body: { message: 'test message' }
      };

      mockBLSService.sign.mockRejectedValue(new Error(errorMessage));

      await blsController.sign(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockLogger.error).toHaveBeenCalledWith(`Error in sign: Error: ${errorMessage}`);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        error: 'Failed to sign message' 
      });
    });
  });

  describe('verify', () => {
    const mockVerifyData = {
      message: 'test message',
      signature: '0x1234',
      publicKey: '0x5678'
    };

    it('should verify signature successfully', async () => {
      mockRequest = {
        body: mockVerifyData
      };

      mockBLSService.verify.mockResolvedValue(true);

      await blsController.verify(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockBLSService.verify).toHaveBeenCalledWith(
        mockVerifyData.message,
        mockVerifyData.signature,
        mockVerifyData.publicKey
      );
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ valid: true });
    });

    it('should handle invalid signature', async () => {
      mockRequest = {
        body: mockVerifyData
      };

      mockBLSService.verify.mockResolvedValue(false);

      await blsController.verify(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ valid: false });
    });

    it('should handle missing parameters', async () => {
      mockRequest = {
        body: { message: 'test' }
      };

      await blsController.verify(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        error: 'Message, signature and publicKey are required' 
      });
    });

    it('should handle verification error', async () => {
      const errorMessage = 'Verification failed';
      mockRequest = {
        body: mockVerifyData
      };

      mockBLSService.verify.mockRejectedValue(new Error(errorMessage));

      await blsController.verify(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockLogger.error).toHaveBeenCalledWith(`Error in verify: Error: ${errorMessage}`);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        error: 'Failed to verify signature' 
      });
    });
  });

  describe('aggregateSignatures', () => {
    it('should aggregate signatures successfully', async () => {
      const signatures = ['0x1234', '0x5678'];
      const aggregatedSignature = '0xabcd';
      mockRequest = {
        body: { signatures }
      };

      mockBLSService.aggregateSignatures.mockResolvedValue(aggregatedSignature);

      await blsController.aggregateSignatures(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockBLSService.aggregateSignatures).toHaveBeenCalledWith(signatures);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        aggregatedSignature 
      });
    });

    it('should handle missing signatures', async () => {
      mockRequest = {
        body: {}
      };

      await blsController.aggregateSignatures(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        error: 'Signatures array is required' 
      });
    });

    it('should handle empty signatures array', async () => {
      mockRequest = {
        body: { signatures: [] }
      };

      await blsController.aggregateSignatures(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        error: 'Signatures array is required' 
      });
    });

    it('should handle invalid signatures array', async () => {
      mockRequest = {
        body: { signatures: 'not-an-array' }
      };

      await blsController.aggregateSignatures(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        error: 'Signatures array is required' 
      });
    });

    it('should handle aggregation error', async () => {
      const errorMessage = 'Aggregation failed';
      const signatures = ['0x1234', '0x5678'];
      mockRequest = {
        body: { signatures }
      };

      mockBLSService.aggregateSignatures.mockRejectedValue(new Error(errorMessage));

      await blsController.aggregateSignatures(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockLogger.error).toHaveBeenCalledWith(`Error in aggregateSignatures: Error: ${errorMessage}`);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        error: 'Failed to aggregate signatures' 
      });
    });
  });

  describe('getPublicKey', () => {
    it('should return public key successfully', async () => {
      const publicKey = '0x1234';
      mockBLSService.getPublicKey.mockReturnValue(publicKey);

      await blsController.getPublicKey(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockBLSService.getPublicKey).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({ publicKey });
    });

    it('should handle error getting public key', async () => {
      const errorMessage = 'Failed to get public key';
      mockBLSService.getPublicKey.mockImplementation(() => {
        throw new Error(errorMessage);
      });

      await blsController.getPublicKey(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockLogger.error).toHaveBeenCalledWith(`Error in getPublicKey: Error: ${errorMessage}`);
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({ 
        error: 'Failed to get public key' 
      });
    });
  });
}); 