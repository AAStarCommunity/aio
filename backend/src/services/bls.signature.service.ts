import { Injectable, Inject } from '@nestjs/common';
import { BLSService } from './bls.service';
import { UserOperationRequest } from '../types/userOperation.type';
import { ethers } from 'ethers';
import logger from '../utils/logger';

/**
 * BLS签名管理服务
 * 负责协调BLS签名过程
 */
@Injectable()
export class BlsSignatureService {
  constructor(
    @Inject(BLSService) private readonly blsService: BLSService
  ) {}

  /**
   * 对UserOperation进行BLS签名（简化版本）
   * @param userOp 用户操作
   * @param requiredNodeCount 需要的节点数量（暂时忽略，只用单节点）
   * @returns 签名
   */
  async signUserOperationWithMultipleNodes(
    userOp: UserOperationRequest,
    requiredNodeCount: number = 3
  ): Promise<string> {
    try {
      logger.info(`开始BLS签名流程`);
      
      // 1. 计算UserOperation哈希
      const userOpHash = this.calculateUserOperationHash(userOp);
      logger.info(`计算得到UserOperation哈希: ${userOpHash}`);
      
      // 2. 获取BLS签名（暂时使用单节点）
      const signature = await this.blsService.sign(userOpHash);
      
      // 3. 验证签名
      const isValid = await this.blsService.verify(userOpHash, signature);
      if (!isValid) {
        throw new Error('BLS签名验证失败');
      }
      
      logger.info(`BLS签名流程完成，签名: ${signature}`);
      return signature;
    } catch (error) {
      logger.error(`BLS签名失败: ${error}`);
      throw new Error(`Failed to sign with BLS: ${error.message}`);
    }
  }

  /**
   * 计算UserOperation哈希
   * @param userOp 用户操作
   * @returns 哈希值
   */
  private calculateUserOperationHash(userOp: UserOperationRequest): string {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    
    // 创建一个临时的userOp，signature为空
    const tempUserOp = { ...userOp, signature: '0x' };
    
    const encodedData = abiCoder.encode(
      ['address', 'uint256', 'bytes', 'bytes', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes', 'bytes'],
      [
        tempUserOp.sender,
        tempUserOp.nonce,
        tempUserOp.initCode,
        tempUserOp.callData,
        tempUserOp.callGasLimit,
        tempUserOp.verificationGasLimit,
        tempUserOp.preVerificationGas,
        tempUserOp.maxFeePerGas,
        tempUserOp.maxPriorityFeePerGas,
        tempUserOp.paymasterAndData,
        tempUserOp.signature
      ]
    );
    
    return ethers.keccak256(encodedData);
  }

  /**
   * 检查BLS健康状态
   */
  async checkBlsNodeHealth(): Promise<{
    totalNodes: number;
    activeNodes: number;
    inactiveNodes: number;
    healthStatus: string;
  }> {
    try {
      // 尝试获取公钥来检查BLS服务是否正常工作
      const publicKey = this.blsService.getPublicKey();
      const isHealthy = publicKey && publicKey.length > 0;
      
      return {
        totalNodes: 1,
        activeNodes: isHealthy ? 1 : 0,
        inactiveNodes: isHealthy ? 0 : 1,
        healthStatus: isHealthy ? 'healthy' : 'unhealthy'
      };
    } catch (error) {
      logger.error(`检查BLS健康状态失败: ${error}`);
      return {
        totalNodes: 1,
        activeNodes: 0,
        inactiveNodes: 1,
        healthStatus: 'unknown'
      };
    }
  }
} 