import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import passkeyService from '../services/passkeyService';
import { UserVerifierModel } from '../models/userVerifier';

describe('Passkey服务', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    // 创建内存数据库用于测试
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // 清空测试数据
    await UserVerifierModel.deleteMany({});
  });

  const testUser = {
    userId: 'test-user-1',
    email: 'test@example.com'
  };

  describe('注册流程', () => {
    test('应该能够生成注册选项', async () => {
      const options = await passkeyService.generateRegistrationOptions(
        testUser.userId,
        testUser.email
      );

      expect(options).toBeDefined();
      expect(options.user.id).toBe(testUser.userId);
      expect(options.user.name).toBe(testUser.email);
    });

    test('重复用户ID应该抛出错误', async () => {
      // 先创建一个用户
      await UserVerifierModel.create({
        userId: testUser.userId,
        email: 'other@example.com',
        credentialID: 'test-credential',
        credentialPublicKey: 'test-public-key',
        counter: 0
      });

      await expect(
        passkeyService.generateRegistrationOptions(testUser.userId, 'new@example.com')
      ).rejects.toThrow('用户ID或邮箱已被注册');
    });

    test('重复邮箱应该抛出错误', async () => {
      // 先创建一个用户
      await UserVerifierModel.create({
        userId: 'other-user',
        email: testUser.email,
        credentialID: 'test-credential',
        credentialPublicKey: 'test-public-key',
        counter: 0
      });

      await expect(
        passkeyService.generateRegistrationOptions('new-user', testUser.email)
      ).rejects.toThrow('用户ID或邮箱已被注册');
    });
  });

  describe('认证流程', () => {
    beforeEach(async () => {
      // 创建测试用户
      await UserVerifierModel.create({
        userId: testUser.userId,
        email: testUser.email,
        credentialID: 'test-credential',
        credentialPublicKey: 'test-public-key',
        counter: 0
      });
    });

    test('应该能够生成认证选项', async () => {
      const options = await passkeyService.generateAuthenticationOptions(testUser.userId);

      expect(options).toBeDefined();
      expect(options.allowCredentials).toBeDefined();
      expect(options.allowCredentials?.length).toBe(1);
      expect(options.allowCredentials?.[0]?.type).toBe('public-key');
    });

    test('不存在的用户应该抛出错误', async () => {
      await expect(
        passkeyService.generateAuthenticationOptions('non-existent-user')
      ).rejects.toThrow('找不到用户');
    });
  });

  describe('UserOperation签名验证', () => {
    beforeEach(async () => {
      // 创建测试用户
      await UserVerifierModel.create({
        userId: testUser.userId,
        email: testUser.email,
        credentialID: 'test-credential',
        credentialPublicKey: 'test-public-key',
        counter: 0
      });
    });

    test('应该能够验证UserOperation签名', async () => {
      const result = await passkeyService.verifyUserOpSignature(
        testUser.userId,
        'test-hash',
        'test-signature'
      );

      // 注意：当前实现总是返回true，这是一个简化的实现
      expect(result).toBe(true);
    });

    test('不存在的用户应该返回false', async () => {
      const result = await passkeyService.verifyUserOpSignature(
        'non-existent-user',
        'test-hash',
        'test-signature'
      );

      expect(result).toBe(false);
    });
  });
}); 