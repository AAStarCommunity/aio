import { PasskeyService } from '../services/passkey.service';
import { User } from '../models/user.model';
import { AppError } from '../middlewares/error.middleware';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

describe('PasskeyService', () => {
  let passkeyService: PasskeyService;
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
    passkeyService = new PasskeyService();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('generateRegistrationOptions', () => {
    test('should generate registration options for new email', async () => {
      const email = 'test@example.com';
      const options = await passkeyService.generateRegistrationOptions(email);

      expect(options).toHaveProperty('challenge');
      expect(options).toHaveProperty('rp');
      expect(options.rp.name).toBe('AAStar');
      expect(options.user.id).toBe(email);
      expect(options.user.name).toBe(email);
    });

    test('should throw error for existing email', async () => {
      const email = 'test@example.com';
      await User.create({
        email,
        credentialId: 'test-id',
        credentialPublicKey: Buffer.from('test'),
        counter: 0,
        aaAddress: '0x1234567890123456789012345678901234567890',
      });

      await expect(passkeyService.generateRegistrationOptions(email))
        .rejects
        .toThrow('该邮箱已注册');
    });
  });

  describe('generateAuthenticationOptions', () => {
    test('should generate authentication options for existing user', async () => {
      const email = 'test@example.com';
      const credentialId = 'test-id';
      await User.create({
        email,
        credentialId,
        credentialPublicKey: Buffer.from('test'),
        counter: 0,
        aaAddress: '0x1234567890123456789012345678901234567890',
      });

      const options = await passkeyService.generateAuthenticationOptions(email);

      expect(options).toHaveProperty('challenge');
      expect(options).toHaveProperty('allowCredentials');
      expect(options.allowCredentials[0].type).toBe('public-key');
    });

    test('should throw error for non-existing user', async () => {
      const email = 'nonexistent@example.com';

      await expect(passkeyService.generateAuthenticationOptions(email))
        .rejects
        .toThrow('用户不存在');
    });
  });
});