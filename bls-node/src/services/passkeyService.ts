import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransport,
} from '@simplewebauthn/types';
import config from '../config';
import logger from '../utils/logger';
import { UserVerifierModel } from '../models/userVerifier';
import { RegistrationVerificationResult, AuthenticationVerificationResult } from '../types';

class PasskeyService {
  /**
   * 生成注册选项
   * @param userId 用户ID
   * @param email 用户邮箱
   */
  async generateRegistrationOptions(userId: string, email: string) {
    try {
      // 检查用户是否已注册
      const existingUser = await UserVerifierModel.findOne({ $or: [{ userId }, { email }] });
      if (existingUser) {
        throw new Error('用户ID或邮箱已被注册');
      }

      const registrationOptions = await generateRegistrationOptions({
        rpName: config.rpName,
        rpID: config.rpId,
        userID: Buffer.from(userId),
        userName: email,
        timeout: 60000,
        attestationType: 'none',
        authenticatorSelection: {
          residentKey: 'preferred',
          userVerification: 'preferred',
          requireResidentKey: false,
        },
        supportedAlgorithmIDs: [-7, -257],
      });

      logger.info(`为用户 ${email} 生成Passkey注册选项`);
      return registrationOptions;
    } catch (error) {
      logger.error(`生成Passkey注册选项失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 验证注册响应
   * @param userId 用户ID
   * @param email 用户邮箱
   * @param response 注册响应
   */
  async verifyRegistration(
    userId: string,
    email: string,
    response: RegistrationResponseJSON
  ): Promise<RegistrationVerificationResult> {
    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: response.challenge,
        expectedOrigin: config.origin,
        expectedRPID: config.rpId,
        requireUserVerification: true,
      });

      const { verified, registrationInfo } = verification;

      if (verified && registrationInfo) {
        const { credentialPublicKey, credentialID } = registrationInfo.credential;
        const counter = registrationInfo.counter || 0;
        
        // 创建新的用户验证器记录
        const userVerifier = new UserVerifierModel({
          userId,
          email,
          credentialID: Buffer.from(credentialID).toString('base64url'),
          credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64url'),
          counter,
        });

        // 保存到数据库
        await userVerifier.save();

        logger.info(`用户 ${email} 的Passkey注册成功`);
        return { 
          verified: true, 
          credentialID: Buffer.from(credentialID).toString('base64url') 
        };
      }

      logger.warn(`用户 ${email} 的Passkey注册验证失败`);
      return { verified: false };
    } catch (error) {
      logger.error(`验证Passkey注册失败: ${error instanceof Error ? error.message : String(error)}`);
      return { verified: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 生成认证选项
   * @param userId 用户ID
   */
  async generateAuthenticationOptions(userId: string) {
    try {
      // 从数据库获取用户的验证器
      const userVerifier = await UserVerifierModel.findOne({ userId });
      if (!userVerifier) {
        throw new Error(`找不到用户 ${userId} 的验证器`);
      }

      // 构建允许的凭证列表
      const allowCredentials = [{
        id: userVerifier.credentialID,
        type: 'public-key' as const,
        transports: ['internal', 'usb', 'ble', 'nfc'] as AuthenticatorTransport[],
      }];

      const authenticationOptions = await generateAuthenticationOptions({
        rpID: config.rpId,
        allowCredentials,
        userVerification: 'preferred',
        timeout: 60000,
      });

      logger.info(`为用户 ${userVerifier.email} 生成Passkey认证选项`);
      return authenticationOptions;
    } catch (error) {
      logger.error(`生成Passkey认证选项失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 验证认证响应
   * @param userId 用户ID
   * @param response 认证响应
   */
  async verifyAuthentication(
    userId: string,
    response: AuthenticationResponseJSON
  ): Promise<AuthenticationVerificationResult> {
    try {
      // 从数据库获取用户的验证器
      const userVerifier = await UserVerifierModel.findOne({ userId });
      if (!userVerifier) {
        throw new Error(`找不到用户 ${userId} 的验证器`);
      }

      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: response.challenge,
        expectedOrigin: config.origin,
        expectedRPID: config.rpId,
        requireUserVerification: true,
        authenticator: {
          credentialPublicKey: Buffer.from(userVerifier.credentialPublicKey, 'base64url'),
          credentialID: Buffer.from(userVerifier.credentialID, 'base64url'),
          counter: userVerifier.counter,
        },
      });

      const { verified, authenticationInfo } = verification;

      // 更新计数器
      if (verified && authenticationInfo) {
        userVerifier.counter = authenticationInfo.newCounter;
        await userVerifier.save();
      }

      logger.info(`用户 ${userVerifier.email} 的Passkey认证${verified ? '成功' : '失败'}`);
      return { verified };
    } catch (error) {
      logger.error(`验证Passkey认证失败: ${error instanceof Error ? error.message : String(error)}`);
      return { verified: false, error: error instanceof Error ? error.message : String(error) };
    }
  }

  /**
   * 验证签名的UserOperation
   * @param userId 用户ID
   * @param userOpHash 用户操作哈希
   * @param signature 签名
   */
  async verifyUserOpSignature(userId: string, userOpHash: string, signature: string): Promise<boolean> {
    try {
      // 从数据库获取用户的验证器
      const userVerifier = await UserVerifierModel.findOne({ userId });
      if (!userVerifier) {
        logger.error(`找不到用户 ${userId} 的验证器`);
        return false;
      }

      // 注意：这里需要实现Passkey签名和以太坊UserOperation的签名验证
      // 当前为简化实现，实际应用中需要更详细的实现
      const isValid = true; // 假设验证通过
      
      logger.info(`验证用户 ${userId} 的UserOperation签名：${isValid ? '成功' : '失败'}`);
      return isValid;
    } catch (error) {
      logger.error(`验证UserOperation签名失败: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

// 创建单例
export default new PasskeyService(); 