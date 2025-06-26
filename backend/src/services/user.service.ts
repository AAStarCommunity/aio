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
  async startLogin(emailOrCredentialId: string) {
    try {
      logger.info(`登录请求，传入的参数: ${emailOrCredentialId}`);
      
      // 如果没有提供参数，生成通用的认证选项
      if (!emailOrCredentialId || emailOrCredentialId === '') {
        logger.info('生成通用认证选项');
        const options = await this.passkeyService.generateAuthenticationOptions([]);
        return options;
      }
      
      // 查找所有用户
      const users = await this.userModel.find().lean();
      logger.info(`数据库中的用户数量: ${users.length}`);
      
      users.forEach((user, index) => {
        logger.info(`用户 ${index + 1} - credentialId: ${user.credentialId}`);
      });
      
      // 在内存中匹配 credentialId，尝试不同的编码格式
      const user = users.find(u => {
        // 1. 直接比较
        if (u.credentialId === emailOrCredentialId) {
          logger.info(`找到匹配用户 (直接比较): ${u.email}`);
          return true;
        }
        
        // 2. 尝试 base64url 解码后比较
        try {
          const decodedStored = Buffer.from(u.credentialId, 'base64url').toString('base64url');
          const decodedInput = Buffer.from(emailOrCredentialId, 'base64url').toString('base64url');
          if (decodedStored === decodedInput) {
            logger.info(`找到匹配用户 (base64url 解码): ${u.email}`);
            return true;
          }
        } catch (e) {}
        
        // 3. 尝试 base64 解码后比较
        try {
          const decodedStored = Buffer.from(u.credentialId, 'base64').toString('base64url');
          const decodedInput = Buffer.from(emailOrCredentialId, 'base64').toString('base64url');
          if (decodedStored === decodedInput) {
            logger.info(`找到匹配用户 (base64 解码): ${u.email}`);
            return true;
          }
        } catch (e) {}
        
        return false;
      });

      if (!user) {
        logger.error(`未找到匹配的用户，传入的参数: ${emailOrCredentialId}`);
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
    credentialId: string,
    response: AuthenticationResponseJSON,
    challenge: string
  ) {
    try {
      logger.info(`完成登录，credentialId: ${credentialId}`);
      logger.info(`credentialId 长度: ${credentialId.length}`);
      
      // 查找所有用户
      const users = await this.userModel.find().lean();
      logger.info(`数据库中的用户数量: ${users.length}`);
      
      users.forEach((user, index) => {
        logger.info(`用户 ${index + 1} - email: ${user.email}, credentialId: ${user.credentialId}, length: ${user.credentialId.length}`);
      });
      
      // 在内存中匹配 credentialId，尝试不同的编码格式
      const user = users.find(u => {
        logger.info(`尝试匹配用户: ${u.email}`);
        
        // 1. 直接比较
        if (u.credentialId === credentialId) {
          logger.info(`找到匹配用户 (直接比较): ${u.email}`);
          return true;
        }
        
        // 2. 比较 response.id 和存储的 credentialId
        if (response.id && u.credentialId === response.id) {
          logger.info(`找到匹配用户 (response.id 比较): ${u.email}`);
          return true;
        }
        
        // 3. 双重解码匹配（处理存储时的双重编码问题）
        try {
          // 第一次解码：base64url -> string
          const firstDecode = Buffer.from(u.credentialId, 'base64url').toString();
          logger.info(`用户 ${u.email} 第一次解码: ${firstDecode}`);
          
          // 第二次解码：base64 -> string
          const secondDecode = Buffer.from(firstDecode, 'base64').toString();
          logger.info(`用户 ${u.email} 第二次解码: ${secondDecode}`);
          
          if (secondDecode === credentialId || secondDecode === response.id) {
            logger.info(`找到匹配用户 (双重解码): ${u.email}`);
            return true;
          }
        } catch (e) {
          logger.info(`双重解码失败: ${e.message}`);
        }
        
        // 4. 尝试将存储的 credentialId 解码为字节，再编码为 base64url，与 response.id 比较
        if (response.id) {
          try {
            const storedBytes = Buffer.from(u.credentialId, 'base64url');
            const responseBytes = Buffer.from(response.id, 'base64url');
            if (storedBytes.equals(responseBytes)) {
              logger.info(`找到匹配用户 (字节比较 response.id): ${u.email}`);
              return true;
            }
          } catch (e) {
            logger.info(`字节比较失败: ${e.message}`);
          }
        }
        
        // 5. 尝试其他编码格式
        try {
          const storedBytes = Buffer.from(u.credentialId, 'base64url');
          const inputBytes = Buffer.from(credentialId, 'base64url');
          if (storedBytes.equals(inputBytes)) {
            logger.info(`找到匹配用户 (字节比较): ${u.email}`);
            return true;
          }
        } catch (e) {}
        
        return false;
      });

      if (!user) {
        logger.error(`未找到匹配的用户，credentialId: ${credentialId}, response.id: ${response.id}`);
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
      await this.userModel.findByIdAndUpdate(user._id, {
        counter: verification.authenticationInfo.newCounter
      });

      return user;
    } catch (error) {
      logger.error('Failed to complete login:', error);
      throw error;
    }
  }
} 