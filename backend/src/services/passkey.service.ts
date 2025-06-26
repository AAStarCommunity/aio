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

const rpName = 'FrontDoor Demo';
const rpID = 'localhost';
const expectedOrigins = [
  'http://localhost:8080',
  'http://localhost:3000'
];

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

      logger.info('Generating registration options with config:', {
        rpName,
        rpID,
        expectedOrigins,
        userEmail: email
      });

      const registrationOptions = await generateRegistrationOptions(options);
      logger.info('Registration options generated successfully');
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
      logger.info('Verifying registration response for email:', email);
      logger.info('Expected challenge:', challenge);
      logger.info('Expected origins:', expectedOrigins);
      logger.info('Expected RP ID:', rpID);
      
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: expectedOrigins,
        expectedRPID: rpID,
      });

      logger.info('Registration verification result:', {
        verified: verification.verified,
        hasRegistrationInfo: !!verification.registrationInfo
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
      logger.info('开始验证认证响应');
      logger.info(`credentialPublicKey 类型: ${typeof credentialPublicKey}`);
      logger.info(`credentialPublicKey 构造函数: ${credentialPublicKey.constructor.name}`);
      
      // 处理 MongoDB Binary 对象或 Buffer
      let publicKeyBuffer: Buffer;
      if (credentialPublicKey.constructor.name === 'Binary') {
        // 如果是 MongoDB Binary 对象，转换为 Buffer
        publicKeyBuffer = Buffer.from(credentialPublicKey.buffer);
        logger.info('从 MongoDB Binary 对象转换为 Buffer');
      } else if (Buffer.isBuffer(credentialPublicKey)) {
        // 如果已经是 Buffer，直接使用
        publicKeyBuffer = credentialPublicKey;
        logger.info('使用现有的 Buffer');
      } else {
        // 其他情况，尝试转换
        publicKeyBuffer = Buffer.from(credentialPublicKey);
        logger.info('从其他类型转换为 Buffer');
      }
      
      logger.info(`转换后的 Buffer 长度: ${publicKeyBuffer.length}`);
      
      // 确保是 Uint8Array 格式
      const publicKeyUint8Array = new Uint8Array(publicKeyBuffer);
      logger.info(`Uint8Array 长度: ${publicKeyUint8Array.length}`);
      
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: expectedOrigins,
        expectedRPID: rpID,
        requireUserVerification: true,
        credential: {
          id: response.id,
          publicKey: publicKeyUint8Array,
          counter
        }
      });

      if (!verification.verified) {
        throw new Error('Invalid authentication response');
      }

      logger.info('认证验证成功');
      return verification;
    } catch (error) {
      logger.error('Authentication verification failed:', error);
      throw error;
    }
  }
} 