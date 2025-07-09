import { Request, Response } from 'express';
import { UserOperationService, TransactionRequest } from '../services/UserOperationService';
import { UserOperationRequest } from '../types/userOperation.type';
import logger from '../utils/logger';
import { Controller, Post, Body, Get, Param, Res, Req } from '@nestjs/common';

/**
 * 用户操作控制器
 */
@Controller('api/userop')
export class UserOperationController {
  constructor(private readonly userOperationService: UserOperationService) {}

  /**
   * 创建并发送带有完整BLS签名的用户操作
   * @param body 请求体
   */
  @Post('signed')
  async createAndSendSignedUserOperation(@Body() body: {
    accountAddress: string;
    txRequest: {
      to: string;
      value: string;
      data?: string;
      operation?: number;
    };
    paymasterEnabled?: boolean;
    passkeyVerification: {
      challenge: string;
      response: any;
      credentialPublicKey: string; // base64编码的公钥
      counter: number;
    };
    requiredNodeCount?: number;
  }) {
    try {
      logger.info(`创建并发送带签名的用户操作: ${JSON.stringify(body)}`);
      
      const { accountAddress, txRequest, paymasterEnabled, passkeyVerification, requiredNodeCount } = body;
      
      if (!accountAddress || !txRequest || !passkeyVerification) {
        throw new Error('Missing required parameters: accountAddress, txRequest, or passkeyVerification');
      }
      
      const transaction: TransactionRequest = {
        to: txRequest.to,
        value: txRequest.value || '0',
        data: txRequest.data || '0x',
        operation: txRequest.operation || 0
      };
      
      // 将base64编码的公钥转换为Buffer
      const credentialPublicKey = Buffer.from(passkeyVerification.credentialPublicKey, 'base64');
      
      const verificationData = {
        challenge: passkeyVerification.challenge,
        response: passkeyVerification.response,
        credentialPublicKey,
        counter: passkeyVerification.counter
      };
      
      // 创建并签名用户操作
      const signedUserOp = await this.userOperationService.createAndSignUserOperation(
        accountAddress,
        transaction,
        paymasterEnabled || false,
        verificationData,
        requiredNodeCount || 3
      );
      
      logger.info(`创建的带签名用户操作: ${JSON.stringify(signedUserOp)}`);
      
      // 发送用户操作
      const userOpHash = await this.userOperationService.sendUserOperation(signedUserOp);
      
      return { 
        userOperation: signedUserOp,
        userOpHash,
        message: '交易已成功提交并完成BLS签名验证'
      };
    } catch (error) {
      logger.error(`创建并发送带签名用户操作错误: ${error}`);
      throw new Error(`Failed to create and send signed user operation: ${error.message}`);
    }
  }

  /**
   * 仅验证passkey并返回签名后的用户操作（不发送）
   * @param body 请求体
   */
  @Post('prepare')
  async prepareSignedUserOperation(@Body() body: {
    accountAddress: string;
    txRequest: {
      to: string;
      value: string;
      data?: string;
      operation?: number;
    };
    paymasterEnabled?: boolean;
    passkeyVerification: {
      challenge: string;
      response: any;
      credentialPublicKey: string;
      counter: number;
    };
    requiredNodeCount?: number;
  }) {
    try {
      logger.info(`准备带签名的用户操作: ${JSON.stringify(body)}`);
      
      const { accountAddress, txRequest, paymasterEnabled, passkeyVerification, requiredNodeCount } = body;
      
      if (!accountAddress || !txRequest || !passkeyVerification) {
        throw new Error('Missing required parameters: accountAddress, txRequest, or passkeyVerification');
      }
      
      const transaction: TransactionRequest = {
        to: txRequest.to,
        value: txRequest.value || '0',
        data: txRequest.data || '0x',
        operation: txRequest.operation || 0
      };
      
      // 将base64编码的公钥转换为Buffer
      const credentialPublicKey = Buffer.from(passkeyVerification.credentialPublicKey, 'base64');
      
      const verificationData = {
        challenge: passkeyVerification.challenge,
        response: passkeyVerification.response,
        credentialPublicKey,
        counter: passkeyVerification.counter
      };
      
      // 创建并签名用户操作（但不发送）
      const signedUserOp = await this.userOperationService.createAndSignUserOperation(
        accountAddress,
        transaction,
        paymasterEnabled || false,
        verificationData,
        requiredNodeCount || 3
      );
      
      logger.info(`准备完成的带签名用户操作: ${JSON.stringify(signedUserOp)}`);
      
      return { 
        userOperation: signedUserOp,
        message: '用户操作已准备完成，包含BLS聚合签名'
      };
    } catch (error) {
      logger.error(`准备带签名用户操作错误: ${error}`);
      throw new Error(`Failed to prepare signed user operation: ${error.message}`);
    }
  }

  /**
   * 创建并发送用户操作（原有接口，保持兼容性）
   * @param body 请求体
   */
  @Post()
  async createAndSendUserOperation(@Body() body: {
    accountAddress: string;
    txRequest: {
      to: string;
      value: string;
      data?: string;
      operation?: number;
    };
    paymasterEnabled?: boolean;
  }) {
    try {
      logger.info(`创建并发送用户操作（兼容模式）: ${JSON.stringify(body)}`);
      
      const { accountAddress, txRequest, paymasterEnabled } = body;
      
      if (!accountAddress || !txRequest) {
        throw new Error('Missing required parameters: accountAddress or txRequest');
      }
      
      const transaction: TransactionRequest = {
        to: txRequest.to,
        value: txRequest.value || '0',
        data: txRequest.data || '0x',
        operation: txRequest.operation || 0
      };
      
      // 创建用户操作（不包含BLS签名）
      const userOp = await this.userOperationService.createUserOperation(
        accountAddress,
        transaction,
        paymasterEnabled || false
      );
      
      logger.info(`创建的用户操作（兼容模式）: ${JSON.stringify(userOp)}`);
      
      // 发送用户操作
      const userOpHash = await this.userOperationService.sendUserOperation(userOp);
      
      return { 
        userOperation: userOp,
        userOpHash,
        message: '交易已提交（兼容模式，无BLS签名验证）'
      };
    } catch (error) {
      logger.error(`创建并发送用户操作错误（兼容模式）: ${error}`);
      throw new Error(`Failed to create and send user operation: ${error.message}`);
    }
  }

  /**
   * 仅发送已签名的用户操作
   * @param userOp 签名后的用户操作
   */
  @Post('send')
  async sendUserOperation(@Body() userOp: UserOperationRequest) {
    try {
      logger.info(`发送用户操作: ${JSON.stringify(userOp)}`);
      return await this.userOperationService.sendUserOperation(userOp);
    } catch (error) {
      logger.error(`发送用户操作错误: ${error}`);
      throw new Error(`Failed to send user operation: ${error.message}`);
    }
  }

  @Get(':hash')
  async getUserOperationStatus(@Param('hash') hash: string) {
    return await this.userOperationService.getUserOperationStatus(hash);
  }

  /**
   * 估算交易gas费用
   * @param body 请求体
   */
  @Post('estimate')
  async estimateTransactionGas(@Body() body: {
    accountAddress: string;
    txRequest: {
      to: string;
      value: string;
      data?: string;
      operation?: number;
    };
    paymasterEnabled?: boolean;
  }) {
    try {
      const { accountAddress, txRequest, paymasterEnabled } = body;
      
      if (!accountAddress || !txRequest) {
        throw new Error('Missing required parameters: accountAddress or txRequest');
      }
      
      const transaction: TransactionRequest = {
        to: txRequest.to,
        value: txRequest.value || '0',
        data: txRequest.data || '0x',
        operation: txRequest.operation || 0
      };
      
      const gasEstimation = await this.userOperationService.estimateTransactionGas(
        accountAddress,
        transaction,
        paymasterEnabled || false
      );
      
      return { gasEstimation };
    } catch (error) {
      logger.error(`估算交易gas费用错误: ${error}`);
      throw new Error(`Failed to estimate transaction gas: ${error.message}`);
    }
  }

  // 保留原有的方法用于兼容性
  /**
   * 创建用户操作
   * @param req 请求
   * @param res 响应
   */
  async createUserOperation(req: Request, res: Response): Promise<void> {
    try {
      const { accountAddress, txRequest, paymasterEnabled } = req.body;
      
      if (!accountAddress || !txRequest) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }
      
      const transaction: TransactionRequest = {
        to: txRequest.to,
        value: txRequest.value || '0',
        data: txRequest.data || '0x',
        operation: txRequest.operation || 0
      };
      
      const userOp = await this.userOperationService.createUserOperation(
        accountAddress,
        transaction,
        paymasterEnabled || false
      );
      
      res.status(200).json({ userOperation: userOp });
    } catch (error) {
      logger.error(`Error in createUserOperation: ${error}`);
      res.status(500).json({ error: `Failed to create user operation: ${error}` });
    }
  }
} 