import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture
} from '@simplewebauthn/types';
import { IUser } from '../models/user.model';
import { AppError } from '../middlewares/error.middleware';
import logger from '../utils/logger';

const rpName = 'AAStar';
const rpID = 'localhost';
const origin = `http://${rpID}:8080`;

@Injectable()
export class PasskeyService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<IUser>
  ) {}

  // 生成注册选项
  async generateRegistrationOptions(email: string): Promise<PublicKeyCredentialCreationOptionsJSON> {
    logger.info(`Checking if email ${email} exists in database...`);
    try {
      // 检查邮箱是否已注册
      const existingUser = await this.userModel.findOne({ email });
      logger.info('Database query result:', existingUser);
      if (existingUser) {
        throw new AppError(400, '该邮箱已注册');
      }

      const options = {
        rpName,
        rpID,
        userID: Buffer.from(email),
        userName: email,
        userDisplayName: email,
        timeout: 60000,
        attestationType: 'none' as const,
        authenticatorSelection: {
          authenticatorAttachment: 'platform' as const,
          residentKey: 'required' as const,
          userVerification: 'preferred' as const
        }
      };

      const registrationOptions = await generateRegistrationOptions(options);
      return registrationOptions;
    } catch (error) {
      logger.error('Failed to generate registration options:', error);
      throw new Error('Registration options generation failed');
    }
  }

  // 验证注册响应
  async verifyRegistration(
    response: RegistrationResponseJSON,
    challenge: string,
    email: string
  ) {
    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new Error('Invalid registration response');
      }

      return {
        verified: verification.verified,
        registrationInfo: {
          credentialID: verification.registrationInfo.credential.id,
          credentialPublicKey: verification.registrationInfo.credential.publicKey,
          counter: 0
        }
      };
    } catch (error) {
      logger.error('Registration verification failed:', error);
      throw error;
    }
  }

  // 生成认证选项
  async generateAuthenticationOptions(
    credentialIds: string[]
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    try {
      const options = {
        timeout: 60000,
        allowCredentials: credentialIds.map(id => ({
          id: id,
          transports: ['internal'] as AuthenticatorTransportFuture[]
        })),
        userVerification: 'preferred' as const,
        rpID
      };

      const authenticationOptions = await generateAuthenticationOptions(options);
      return authenticationOptions;
    } catch (error) {
      logger.error('Failed to generate authentication options:', error);
      throw new Error('Authentication options generation failed');
    }
  }

  // 验证认证响应
  async verifyAuthentication(
    response: AuthenticationResponseJSON,
    challenge: string,
    credentialPublicKey: Buffer,
    counter: number
  ) {
    try {
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: true,
        credential: {
          id: response.id,
          publicKey: credentialPublicKey,
          counter
        }
      });

      if (!verification.verified) {
        throw new Error('Invalid authentication response');
      }

      return verification;
    } catch (error) {
      logger.error('Authentication verification failed:', error);
      throw error;
    }
  }
} 