import { BLSService } from '../services/bls.service';
import { ConfigService } from '@nestjs/config';
import { UserOperation } from '../types/userOperation.type';

describe('BLSService', () => {
  let blsService: BLSService;
  let mockConfigService: jest.Mocked<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          'bls.privateKey': 'b37294901c310441cd3c22c0b8d17cd62c7b86e0a59e12e7da5f7eb12c2c325b',
          'ethereum.rpcUrl': 'http://localhost:8545'
        };
        return config[key];
      }),
    } as any;

    blsService = new BLSService(mockConfigService);
    jest.clearAllMocks();
  });

  const mockUserOp: UserOperation = {
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

  describe('calculateUserOpHash', () => {
    it('should calculate user operation hash correctly', () => {
      const hash = blsService.calculateUserOpHash(mockUserOp);
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).toMatch(/^0x[a-fA-F0-9]{64}$/);
    });
  });

  describe('Service Initialization', () => {
    it('should initialize successfully', () => {
      expect(blsService).toBeDefined();
      // 服务初始化成功，说明配置正确
    });

    it('should throw error when private key is missing', () => {
      const badConfigService = {
        get: jest.fn((key: string) => {
          if (key === 'bls.privateKey') return undefined;
          return 'http://localhost:8545';
        }),
      } as any;

      expect(() => new BLSService(badConfigService)).toThrow('BLS private key is not configured');
    });
  });
});