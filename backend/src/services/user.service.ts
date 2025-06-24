import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { IUser } from '../models/user.model';
import { PasskeyService } from './passkey.service';
import { AppError } from '../middlewares/error.middleware';
import logger from '../utils/logger';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON
} from '@simplewebauthn/types';

@Injectable()
export class UserService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<IUser>,
    private readonly passkeyService: PasskeyService
  ) {}

  // 开始注册流程
  async startRegistration(email: string) {
    try {
      const options = await this.passkeyService.generateRegistrationOptions(email);
      return options;
    } catch (error) {
      logger.error('Failed to start registration:', error);
      throw error;
    }
  }

  // 完成注册流程
  async completeRegistration(
    email: string,
    response: RegistrationResponseJSON,
    challenge: string,
    aaAddress: string
  ) {
    try {
      const verification = await this.passkeyService.verifyRegistration(
        response,
        challenge,
        email
      );

      if (!verification.registrationInfo) {
        throw new AppError(400, '注册验证失败');
      }

      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

      // 创建新用户
      const user = new this.userModel({
        email,
        credentialId: Buffer.from(credentialID).toString('base64url'),
        credentialPublicKey: Buffer.from(credentialPublicKey),
        counter,
        aaAddress,
      });

      await user.save();
      return user;
    } catch (error) {
      logger.error('Failed to complete registration:', error);
      throw error;
    }
  }

  // 开始登录流程
  async startLogin(email: string) {
    try {
      const user = await this.userModel.findOne({ email });
      if (!user) {
        throw new AppError(404, '用户不存在');
      }

      const options = await this.passkeyService.generateAuthenticationOptions([user.credentialId]);
      return options;
    } catch (error) {
      logger.error('Failed to start login:', error);
      throw error;
    }
  }

  // 完成登录流程
  async completeLogin(
    email: string,
    response: AuthenticationResponseJSON,
    challenge: string
  ) {
    try {
      const user = await this.userModel.findOne({ email });
      if (!user) {
        throw new AppError(404, '用户不存在');
      }

      const verification = await this.passkeyService.verifyAuthentication(
        response,
        challenge,
        user.credentialPublicKey,
        user.counter
      );

      if (!verification.verified) {
        throw new AppError(401, '登录验证失败');
      }

      // 更新计数器
      user.counter = verification.authenticationInfo.newCounter;
      await user.save();

      return user;
    } catch (error) {
      logger.error('Failed to complete login:', error);
      throw error;
    }
  }
} 