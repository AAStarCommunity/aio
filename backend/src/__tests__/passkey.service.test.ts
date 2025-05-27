/// <reference types="jest" />

import { PasskeyService } from '../services/passkey.service';
import { User } from '../models/user.model';
import { AppError } from '../middlewares/error.middleware';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { 
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server';
import type { 
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/types';

// Mock logger
jest.mock('../utils/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
}));

jest.mock('@simplewebauthn/server');

describe('PasskeyService', () => {
  let passkeyService: PasskeyService;
  let mongoServer: MongoMemoryServer;
  const mockGenerateRegistrationOptions = generateRegistrationOptions as jest.Mock;
  const mockVerifyRegistrationResponse = verifyRegistrationResponse as jest.Mock;
  const mockGenerateAuthenticationOptions = generateAuthenticationOptions as jest.Mock;
  const mockVerifyAuthenticationResponse = verifyAuthenticationResponse as jest.Mock;

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
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  describe('generateRegistrationOptions', () => {
    const mockEmail = 'test@example.com';
    const mockOptions: PublicKeyCredentialCreationOptionsJSON = {
      challenge: 'mockChallenge',
      rp: {
        name: 'AAStar',
        id: 'localhost'
      },
      user: {
        id: 'mockUserId',
        name: mockEmail,
        displayName: mockEmail
      },
      pubKeyCredParams: [],
      timeout: 60000,
      attestation: 'direct',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        requireResidentKey: true,
        userVerification: 'preferred'
      }
    };

    it('should generate registration options', async () => {
      mockGenerateRegistrationOptions.mockResolvedValue(mockOptions);

      const options = await passkeyService.generateRegistrationOptions(mockEmail);

      expect(mockGenerateRegistrationOptions).toHaveBeenCalled();
      expect(options).toEqual(mockOptions);
      expect(options.user.name).toBe(mockEmail);
      expect(options.rp.name).toBe('AAStar');
    });

    it('should handle errors during registration options generation', async () => {
      const error = new Error('Registration options generation failed');
      mockGenerateRegistrationOptions.mockRejectedValue(error);

      await expect(passkeyService.generateRegistrationOptions(mockEmail))
        .rejects
        .toThrow('Registration options generation failed');
    });
  });

  describe('verifyRegistrationResponse', () => {
    const mockEmail = 'test@example.com';
    const mockResponse: RegistrationResponseJSON = {
      id: 'mockCredentialId',
      rawId: 'mockRawId',
      response: {
        clientDataJSON: 'mockClientData',
        attestationObject: 'mockAttestationObject',
        transports: ['internal']
      },
      type: 'public-key',
      clientExtensionResults: {}
    };
    const mockChallenge = 'mockChallenge';
    const mockVerification = {
      verified: true,
      registrationInfo: {
        fmt: 'none',
        counter: 0,
        credentialType: 'public-key',
        credential: {
          id: Buffer.from('mockCredentialId'),
          publicKey: Buffer.from('mockPublicKey'),
          algorithm: -7
        }
      }
    };

    it('should verify valid registration response', async () => {
      mockVerifyRegistrationResponse.mockResolvedValue(mockVerification);

      const result = await passkeyService.verifyRegistration(
        mockResponse,
        mockChallenge,
        mockEmail
      );

      expect(mockVerifyRegistrationResponse).toHaveBeenCalled();
      expect(result.verified).toBe(true);
      expect(result.registrationInfo).toHaveProperty('credentialID');
      expect(result.registrationInfo).toHaveProperty('credentialPublicKey');
      expect(result.registrationInfo).toHaveProperty('counter');
    });

    it('should handle invalid registration response', async () => {
      const error = new Error('Invalid registration response');
      mockVerifyRegistrationResponse.mockRejectedValue(error);

      await expect(passkeyService.verifyRegistration(
        mockResponse,
        mockChallenge,
        mockEmail
      )).rejects.toThrow('Invalid registration response');
    });
  });

  describe('generateAuthenticationOptions', () => {
    const mockCredentialId = 'mockCredentialId';
    const mockOptions: PublicKeyCredentialRequestOptionsJSON = {
      challenge: 'mockChallenge',
      allowCredentials: [{
        id: mockCredentialId,
        type: 'public-key',
        transports: ['internal']
      }],
      timeout: 60000,
      userVerification: 'preferred',
      rpId: 'localhost'
    };

    it('should generate authentication options', async () => {
      mockGenerateAuthenticationOptions.mockResolvedValue(mockOptions);

      const options = await passkeyService.generateAuthenticationOptions([mockCredentialId]);

      expect(mockGenerateAuthenticationOptions).toHaveBeenCalled();
      expect(options).toEqual(mockOptions);
      expect(options.allowCredentials?.[0].id).toBe(mockCredentialId);
    });

    it('should handle errors during authentication options generation', async () => {
      const error = new Error('Authentication options generation failed');
      mockGenerateAuthenticationOptions.mockRejectedValue(error);

      await expect(passkeyService.generateAuthenticationOptions([mockCredentialId]))
        .rejects
        .toThrow('Authentication options generation failed');
    });
  });

  describe('verifyAuthenticationResponse', () => {
    const mockResponse: AuthenticationResponseJSON = {
      id: 'mockCredentialId',
      rawId: 'mockRawId',
      response: {
        clientDataJSON: 'mockClientData',
        authenticatorData: 'mockAuthenticatorData',
        signature: 'mockSignature',
        userHandle: 'mockUserHandle'
      },
      type: 'public-key',
      clientExtensionResults: {}
    };
    const mockChallenge = 'mockChallenge';
    const mockCredentialPublicKey = Buffer.from('mockPublicKey');
    const mockCounter = 0;
    const mockVerification = {
      verified: true,
      authenticationInfo: {
        newCounter: 1
      }
    };

    it('should verify valid authentication response', async () => {
      mockVerifyAuthenticationResponse.mockResolvedValue(mockVerification);

      const result = await passkeyService.verifyAuthentication(
        mockResponse,
        mockChallenge,
        mockCredentialPublicKey,
        mockCounter
      );

      expect(mockVerifyAuthenticationResponse).toHaveBeenCalled();
      expect(result).toEqual(mockVerification);
      expect(result.verified).toBe(true);
    });

    it('should handle invalid authentication response', async () => {
      const error = new Error('Invalid authentication response');
      mockVerifyAuthenticationResponse.mockRejectedValue(error);

      await expect(passkeyService.verifyAuthentication(
        mockResponse,
        mockChallenge,
        mockCredentialPublicKey,
        mockCounter
      )).rejects.toThrow('Invalid authentication response');
    });
  });
});