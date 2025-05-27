import { UserService } from '../services/user.service';
import { User } from '../models/user.model';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import type { 
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/types';

jest.mock('../services/passkey.service', () => {
  return {
    PasskeyService: jest.fn().mockImplementation(() => ({
      generateRegistrationOptions: jest.fn().mockResolvedValue({
        challenge: 'test-challenge',
        rp: { name: 'AAStar', id: 'localhost' },
        user: { id: 'test@example.com', name: 'test@example.com' },
      }),
      verifyRegistration: jest.fn().mockResolvedValue({
        verified: true,
        registrationInfo: {
          credentialID: Buffer.from('test-id'),
          credentialPublicKey: Buffer.from('test'),
          counter: 0,
        }
      }),
      generateAuthenticationOptions: jest.fn().mockResolvedValue({
        challenge: 'test-challenge',
        allowCredentials: [{ id: 'test-id', type: 'public-key' }],
      }),
      verifyAuthentication: jest.fn().mockResolvedValue({
        verified: true,
        authenticationInfo: {
          newCounter: 1
        }
      }),
    })),
  };
});

describe('UserService', () => {
  let userService: UserService;
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    userService = new UserService();
  });

  afterEach(async () => {
    await User.deleteMany({});
    jest.clearAllMocks();
  });

  describe('startRegistration', () => {
    test('should start registration process', async () => {
      const email = 'test@example.com';
      const options = await userService.startRegistration(email);

      expect(options).toHaveProperty('challenge');
      expect(options).toHaveProperty('rp');
      expect(options.rp.name).toBe('AAStar');
    });
  });

  describe('completeRegistration', () => {
    test('should complete registration process', async () => {
      const email = 'test@example.com';
      const response: RegistrationResponseJSON = {
        id: 'test-id',
        rawId: 'test-raw-id',
        response: {
          clientDataJSON: 'test-client-data',
          attestationObject: 'test-attestation',
          transports: ['internal']
        },
        type: 'public-key',
        clientExtensionResults: {}
      };
      const challenge = 'test-challenge';
      const aaAddress = '0x1234567890123456789012345678901234567890';

      const user = await userService.completeRegistration(
        email,
        response,
        challenge,
        aaAddress
      );

      expect(user).toHaveProperty('email', email);
      expect(user).toHaveProperty('aaAddress', aaAddress);
      expect(user).toHaveProperty('credentialId');
    });
  });

  describe('startLogin', () => {
    test('should start login process', async () => {
      // 先创建用户
      const email = 'test@example.com';
      await User.create({
        email,
        credentialId: 'test-id',
        credentialPublicKey: Buffer.from('test'),
        counter: 0,
        aaAddress: '0x1234567890123456789012345678901234567890',
      });

      const options = await userService.startLogin(email);

      expect(options).toHaveProperty('challenge');
      expect(options).toHaveProperty('allowCredentials');
    });

    test('should throw error for non-existing user', async () => {
      const email = 'nonexistent@example.com';
      await expect(userService.startLogin(email)).rejects.toThrow('用户不存在');
    });
  });

  describe('completeLogin', () => {
    test('should complete login process', async () => {
      const email = 'test@example.com';
      const user = await User.create({
        email,
        credentialId: 'test-id',
        credentialPublicKey: Buffer.from('test'),
        counter: 0,
        aaAddress: '0x1234567890123456789012345678901234567890',
      });

      const response: AuthenticationResponseJSON = {
        id: 'test-id',
        rawId: 'test-raw-id',
        response: {
          clientDataJSON: 'test-client-data',
          authenticatorData: 'test-authenticator-data',
          signature: 'test-signature',
          userHandle: 'test-user-handle'
        },
        type: 'public-key',
        clientExtensionResults: {}
      };
      const challenge = 'test-challenge';

      const result = await userService.completeLogin(email, response, challenge);

      expect(result).toHaveProperty('email', email);
      expect(result).toHaveProperty('aaAddress', user.aaAddress);
    });

    test('should throw error for non-existing user', async () => {
      const email = 'nonexistent@example.com';
      const response: AuthenticationResponseJSON = {
        id: 'test-id',
        rawId: 'test-raw-id',
        response: {
          clientDataJSON: 'test-client-data',
          authenticatorData: 'test-authenticator-data',
          signature: 'test-signature',
          userHandle: 'test-user-handle'
        },
        type: 'public-key',
        clientExtensionResults: {}
      };
      const challenge = 'test-challenge';

      await expect(userService.completeLogin(email, response, challenge)).rejects.toThrow('用户不存在');
    });
  });
});

describe('PasskeyService', () => {
  describe('verifyRegistrationResponse', () => {
    it('should verify valid registration response', async () => {
      // 添加 WebAuthn 注册响应的模拟数据
      // 验证注册过程
    });
    
    it('should reject invalid registration response', async () => {
      // 测试无效数据的处理
    });
  });
  
  describe('verifyAuthenticationResponse', () => {
    it('should verify valid authentication response', async () => {
      // 添加 WebAuthn 认证响应的模拟数据
      // 验证认证过程
    });
    
    it('should reject invalid authentication response', async () => {
      // 测试无效数据的处理
    });
  });
});

describe('BLSService', () => {
  describe('sign', () => {
    it('should generate valid BLS signature', async () => {
      // 测试签名生成
    });
  });
  
  describe('verify', () => {
    it('should verify valid signature', async () => {
      // 测试签名验证
    });
  });
  
  describe('aggregateSignatures', () => {
    it('should aggregate multiple signatures', async () => {
      // 测试签名聚合
    });
  });
});

describe('TransactionService', () => {
  describe('createUserOperation', () => {
    it('should create valid UserOperation', async () => {
      // 测试 UserOperation 构造
    });
  });
  
  describe('submitTransaction', () => {
    it('should submit transaction successfully', async () => {
      // 测试交易提交
    });
  });
});