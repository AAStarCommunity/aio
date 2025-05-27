import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { PasskeyService } from '../services/passkey.service';
import { User } from '../models/user.model';
import { AppError } from '../middlewares/error.middleware';

// 模拟 WebAuthn 响应数据
const mockRegistrationResponse = {
  id: 'mockCredentialId',
  rawId: Buffer.from('mockCredentialId'),
  response: {
    clientDataJSON: Buffer.from(JSON.stringify({
      type: 'webauthn.create',
      challenge: 'mockChallenge',
      origin: 'http://localhost:3000',
    })),
    attestationObject: Buffer.from('mockAttestationObject'),
  },
  type: 'public-key',
  clientExtensionResults: {},
};

const mockAuthenticationResponse = {
  id: 'mockCredentialId',
  rawId: Buffer.from('mockCredentialId'),
  response: {
    clientDataJSON: Buffer.from(JSON.stringify({
      type: 'webauthn.get',
      challenge: 'mockChallenge',
      origin: 'http://localhost:3000',
    })),
    authenticatorData: Buffer.from('mockAuthenticatorData'),
    signature: Buffer.from('mockSignature'),
    userHandle: Buffer.from('mockUserHandle'),
  },
  type: 'public-key',
  clientExtensionResults: {},
};

describe('PasskeyService', () => {
  let passkeyService: PasskeyService;
  let mongoServer: MongoMemoryServer;

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
    it('should generate registration options for new user', async () => {
      const email = 'test@example.com';
      const options = await passkeyService.generateRegistrationOptions(email);

      expect(options).toBeDefined();
      expect(options.user.name).toBe(email);
      expect(options.user.displayName).toBe(email);
      expect(options.timeout).toBe(60000);
      expect(options.attestationType).toBe('none');
      expect(options.authenticatorSelection.residentKey).toBe('required');
      expect(options.authenticatorSelection.userVerification).toBe('preferred');
      expect(options.pubKeyCredParams).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ alg: -7 }),
          expect.objectContaining({ alg: -257 }),
        ])
      );
    });

    it('should throw error if email already exists', async () => {
      const email = 'test@example.com';
      await User.create({
        email,
        credentialId: 'existingId',
        credentialPublicKey: Buffer.from('existingKey'),
        counter: 0,
      });

      await expect(passkeyService.generateRegistrationOptions(email))
        .rejects.toThrow('该邮箱已注册');
    });
  });

  describe('verifyRegistration', () => {
    it('should verify registration response and return credential info', async () => {
      const email = 'test@example.com';
      const challenge = 'mockChallenge';

      const result = await passkeyService.verifyRegistration(
        email,
        mockRegistrationResponse,
        challenge
      );

      expect(result).toBeDefined();
      expect(result.credentialID).toBeDefined();
      expect(result.credentialPublicKey).toBeInstanceOf(Buffer);
      expect(result.counter).toBeDefined();
    });

    it('should throw error on invalid registration response', async () => {
      const email = 'test@example.com';
      const challenge = 'wrongChallenge';

      await expect(passkeyService.verifyRegistration(
        email,
        {
          ...mockRegistrationResponse,
          response: {
            ...mockRegistrationResponse.response,
            clientDataJSON: Buffer.from(JSON.stringify({
              type: 'webauthn.create',
              challenge: 'wrongChallenge',
              origin: 'http://localhost:3000',
            })),
          },
        },
        challenge
      )).rejects.toThrow('注册验证失败');
    });

    it('should throw error if response type is not webauthn.create', async () => {
      const email = 'test@example.com';
      const challenge = 'mockChallenge';

      await expect(passkeyService.verifyRegistration(
        email,
        {
          ...mockRegistrationResponse,
          response: {
            ...mockRegistrationResponse.response,
            clientDataJSON: Buffer.from(JSON.stringify({
              type: 'webauthn.get',
              challenge: 'mockChallenge',
              origin: 'http://localhost:3000',
            })),
          },
        },
        challenge
      )).rejects.toThrow('注册验证失败');
    });
  });

  describe('generateAuthenticationOptions', () => {
    it('should generate authentication options for existing user', async () => {
      const email = 'test@example.com';
      await User.create({
        email,
        credentialId: Buffer.from('mockCredentialId').toString('base64url'),
        credentialPublicKey: Buffer.from('mockPublicKey'),
        counter: 0,
      });

      const options = await passkeyService.generateAuthenticationOptions(email);

      expect(options).toBeDefined();
      expect(options.timeout).toBe(60000);
      expect(options.userVerification).toBe('preferred');
      expect(options.allowCredentials).toHaveLength(1);
      expect(options.allowCredentials[0].type).toBe('public-key');
    });

    it('should throw error if user not found', async () => {
      const email = 'nonexistent@example.com';

      await expect(passkeyService.generateAuthenticationOptions(email))
        .rejects.toThrow('用户不存在');
    });
  });

  describe('verifyAuthentication', () => {
    it('should verify authentication response', async () => {
      const email = 'test@example.com';
      const challenge = 'mockChallenge';

      await User.create({
        email,
        credentialId: Buffer.from('mockCredentialId').toString('base64url'),
        credentialPublicKey: Buffer.from('mockPublicKey'),
        counter: 0,
      });

      const result = await passkeyService.verifyAuthentication(
        email,
        mockAuthenticationResponse,
        challenge
      );

      expect(result).toBe(true);
    });

    it('should throw error if user not found', async () => {
      const email = 'nonexistent@example.com';
      const challenge = 'mockChallenge';

      await expect(passkeyService.verifyAuthentication(
        email,
        mockAuthenticationResponse,
        challenge
      )).rejects.toThrow('用户不存在');
    });

    it('should throw error if response type is not webauthn.get', async () => {
      const email = 'test@example.com';
      const challenge = 'mockChallenge';

      await User.create({
        email,
        credentialId: Buffer.from('mockCredentialId').toString('base64url'),
        credentialPublicKey: Buffer.from('mockPublicKey'),
        counter: 0,
      });

      await expect(passkeyService.verifyAuthentication(
        email,
        {
          ...mockAuthenticationResponse,
          response: {
            ...mockAuthenticationResponse.response,
            clientDataJSON: Buffer.from(JSON.stringify({
              type: 'webauthn.create',
              challenge: 'mockChallenge',
              origin: 'http://localhost:3000',
            })),
          },
        },
        challenge
      )).rejects.toThrow('登录验证失败');
    });

    it('should handle Buffer to Uint8Array conversion for credentialPublicKey', async () => {
      const email = 'test@example.com';
      const challenge = 'mockChallenge';

      await User.create({
        email,
        credentialId: Buffer.from('mockCredentialId').toString('base64url'),
        credentialPublicKey: Buffer.from('mockPublicKey'),
        counter: 0,
      });

      const result = await passkeyService.verifyAuthentication(
        email,
        mockAuthenticationResponse,
        challenge
      );

      expect(result).toBe(true);
    });
  });
}); 