import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { UserService } from '../services/user.service';
import { User } from '../models/user.model';

describe('UserService', () => {
  let userService = null;
  let mongoServer = null;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
    userService = new UserService();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await User.deleteMany({});
  });

  describe('createUser', () => {
    it('should create a new user', async () => {
      const userData = {
        email: 'test@example.com',
        aaAddress: '0x1234567890123456789012345678901234567890'
      };

      const user = await userService.createUser(userData);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.aaAddress).toBe(userData.aaAddress);
    });

    it('should throw error if user already exists', async () => {
      const userData = {
        email: 'test@example.com',
        aaAddress: '0x1234567890123456789012345678901234567890'
      };

      await userService.createUser(userData);

      await expect(userService.createUser(userData)).rejects.toThrow();
    });
  });

  describe('findUserByEmail', () => {
    it('should find user by email', async () => {
      const userData = {
        email: 'test@example.com',
        aaAddress: '0x1234567890123456789012345678901234567890'
      };

      await userService.createUser(userData);

      const user = await userService.findUserByEmail(userData.email);

      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
    });

    it('should return null if user not found', async () => {
      const user = await userService.findUserByEmail('nonexistent@example.com');

      expect(user).toBeNull();
    });
  });

  describe('findUserByAAAddress', () => {
    it('should find user by AA address', async () => {
      const userData = {
        email: 'test@example.com',
        aaAddress: '0x1234567890123456789012345678901234567890'
      };

      await userService.createUser(userData);

      const user = await userService.findUserByAAAddress(userData.aaAddress);

      expect(user).toBeDefined();
      expect(user.aaAddress).toBe(userData.aaAddress);
    });

    it('should return null if user not found', async () => {
      const user = await userService.findUserByAAAddress('0x0000000000000000000000000000000000000000');

      expect(user).toBeNull();
    });
  });
}); 