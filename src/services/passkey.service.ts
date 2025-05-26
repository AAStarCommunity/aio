import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  GenerateRegistrationOptionsOpts,
  VerifyRegistrationResponseOpts,
  GenerateAuthenticationOptionsOpts,
  VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
import { User } from '../models/user.model';
import { AppError } from '../middlewares/error.middleware';
import logger from '../utils/logger';

const rpName = 'AAStar';
const rpID = 'localhost';
const origin = `http://${rpID}:3000`;

export class PasskeyService {
  // 生成注册选项
  async generateRegistrationOptions(email: string) {
    // 检查邮箱是否已注册
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new AppError(400, '该邮箱已注册');
    }

    const options: GenerateRegistrationOptionsOpts = {
      rpName,
      rpID,
      userID: email,
      userName: email,
      timeout: 60000,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
    };

    const registrationOptions = await generateRegistrationOptions(options);
    
    // 返回注册选项
    return registrationOptions;
  }

  // 验证注册响应
  async verifyRegistration(
    email: string,
    response: any,
    challenge: string
  ) {
    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
      });

      if (!verification.verified || !verification.registrationInfo) {
        throw new AppError(400, '注册验证失败');
      }

      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

      return {
        credentialID: Buffer.from(credentialID).toString('base64url'),
        credentialPublicKey: Buffer.from(credentialPublicKey),
        counter,
      };
    } catch (error) {
      logger.error('Passkey registration verification failed:', error);
      throw new AppError(400, '注册验证失败');
    }
  }

  // 生成登录选项
  async generateAuthenticationOptions(email: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError(404, '用户不存在');
    }

    const options: GenerateAuthenticationOptionsOpts = {
      timeout: 60000,
      allowCredentials: [{
        id: Buffer.from(user.credentialId, 'base64url'),
        type: 'public-key',
      }],
      userVerification: 'preferred',
      rpID,
    };

    const authenticationOptions = await generateAuthenticationOptions(options);

    return authenticationOptions;
  }

  // 验证登录响应
  async verifyAuthentication(
    email: string,
    response: any,
    challenge: string
  ) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError(404, '用户不存在');
    }

    try {
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challenge,
        expectedOrigin: origin,
        expectedRPID: rpID,
        authenticator: {
          credentialID: Buffer.from(user.credentialId, 'base64url'),
          credentialPublicKey: user.credentialPublicKey,
          counter: user.counter,
        },
      });

      if (!verification.verified) {
        throw new AppError(401, '登录验证失败');
      }

      // 更新计数器
      user.counter = verification.authenticationInfo.newCounter;
      await user.save();

      return true;
    } catch (error) {
      logger.error('Passkey authentication verification failed:', error);
      throw new AppError(401, '登录验证失败');
    }
  }
} 