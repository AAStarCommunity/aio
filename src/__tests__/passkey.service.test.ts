import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { PasskeyService } from '../services/passkey.service';
import { User } from '../models/user.model';

describe('PasskeyService', () => {
  let passkeyService;
  let mongoServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    passkeyService = new PasskeyService();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('generateRegistrationOptions', () => {
    it('should generate registration options', async () => {
      const email = 'test@example.com';
      const options = await passkeyService.generateRegistrationOptions(email);

      expect(options).toBeDefined();
      expect(options.user.name).toBe(email);
      expect(options.user.displayName).toBe(email);
    });
  });

  describe('generateAuthenticationOptions', () => {
    it('should generate authentication options', async () => {
      const options = await passkeyService.generateAuthenticationOptions();

      expect(options).toBeDefined();
      expect(options.timeout).toBeGreaterThan(0);
      expect(options.userVerification).toBe('preferred');
    });
  });

  // 注意：验证注册和验证认证的测试需要模拟WebAuthn响应数据
  // 这部分测试可能需要更复杂的设置和模拟
  describe('verifyRegistrationResponse', () => {
    it('should be implemented with mock data', () => {
      // TODO: 实现使用模拟数据的测试
      expect(true).toBe(true);
    });
  });

  describe('verifyAuthenticationResponse', () => {
    it('should be implemented with mock data', () => {
      // TODO: 实现使用模拟数据的测试
      expect(true).toBe(true);
    });
  });
}); 