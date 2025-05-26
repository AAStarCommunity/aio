import { UserService } from '../services/user.service';
import { User } from '../models/user.model';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';

jest.mock('../services/passkey.service', () => {
  return {
    PasskeyService: jest.fn().mockImplementation(() => ({
      generateRegistrationOptions: jest.fn().mockResolvedValue({
        challenge: 'test-challenge',
        rp: { name: 'AAStar', id: 'localhost' },
        user: { id: 'test@example.com', name: 'test@example.com' },
      }),
      verifyRegistration: jest.fn().mockResolvedValue({
        credentialID: 'test-id',
        credentialPublicKey: Buffer.from('test'),
        counter: 0,
      }),
      generateAuthenticationOptions: jest.fn().mockResolvedValue({
        challenge: 'test-challenge',
        allowCredentials: [{ id: 'test-id', type: 'public-key' }],
      }),
      verifyAuthentication: jest.fn().mockResolvedValue(true),
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
      const response = { id: 'test-id' };
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
      expect(user).toHaveProperty('credentialId', 'test-id');
    });
  });

  describe('startLogin', () => {
    test('should start login process', async () => {
      const email = 'test@example.com';
      const options = await userService.startLogin(email);

      expect(options).toHaveProperty('challenge');
      expect(options).toHaveProperty('allowCredentials');
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

      const response = { id: 'test-id' };
      const challenge = 'test-challenge';

      const result = await userService.completeLogin(email, response, challenge);

      expect(result).toHaveProperty('email', email);
      expect(result).toHaveProperty('aaAddress', user.aaAddress);
    });
  });
});