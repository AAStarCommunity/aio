import { User } from '../models/user.model';
import { PasskeyService } from './passkey.service';
import { AppError } from '../middlewares/error.middleware';
import logger from '../utils/logger';

export class UserService {
  private passkeyService: PasskeyService;

  constructor() {
    this.passkeyService = new PasskeyService();
  }

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
    response: any,
    challenge: string,
    aaAddress: string
  ) {
    try {
      const { credentialID, credentialPublicKey, counter } = 
        await this.passkeyService.verifyRegistration(email, response, challenge);

      // 创建新用户
      const user = new User({
        email,
        credentialId: credentialID,
        credentialPublicKey,
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
      const options = await this.passkeyService.generateAuthenticationOptions(email);
      return options;
    } catch (error) {
      logger.error('Failed to start login:', error);
      throw error;
    }
  }

  // 完成登录流程
  async completeLogin(
    email: string,
    response: any,
    challenge: string
  ) {
    try {
      const verified = await this.passkeyService.verifyAuthentication(
        email,
        response,
        challenge
      );

      if (!verified) {
        throw new AppError(401, '登录验证失败');
      }

      const user = await User.findOne({ email });
      if (!user) {
        throw new AppError(404, '用户不存在');
      }

      return user;
    } catch (error) {
      logger.error('Failed to complete login:', error);
      throw error;
    }
  }

  // 获取用户信息
  async getUserByEmail(email: string) {
    const user = await User.findOne({ email });
    if (!user) {
      throw new AppError(404, '用户不存在');
    }
    return user;
  }
} 