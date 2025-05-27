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

    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(email).toString('base64url'),
      userName: email,
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'preferred',
      },
      supportedAlgorithmIDs: [-7, -257],
    });

    return options;
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
        expectedType: 'webauthn.create',
        requireUserVerification: false,
      });

      if (verification.verified) {
        const { registrationInfo } = verification;
        const { credentialPublicKey, credentialID, counter } = registrationInfo;

        // 创建新用户
        const user = new User({
          email,
          credentialId: Buffer.from(credentialID).toString('base64url'),
          credentialPublicKey: Buffer.from(credentialPublicKey),
          counter,
        });

        await user.save();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('注册验证失败:', error);
      throw new AppError(400, '注册验证失败');
    }
  }

  // 生成认证选项
  async generateAuthenticationOptions(email: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError(404, '用户不存在');
    }

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials: [{
        id: Buffer.from(user.credentialId, 'base64url'),
        type: 'public-key',
      }],
      userVerification: 'preferred',
    });

    return options;
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
        expectedType: 'webauthn.get',
        credential: {
          id: user.credentialId,
          publicKey: new Uint8Array(user.credentialPublicKey),
          counter: user.counter,
        },
        requireUserVerification: false,
      });

      if (verification.verified) {
        // 更新计数器
        user.counter = verification.authenticationInfo.newCounter;
        await user.save();
        return true;
      }

      return false;
    } catch (error) {
      logger.error('登录验证失败:', error);
      throw new AppError(400, '登录验证失败');
    }
  }
} 