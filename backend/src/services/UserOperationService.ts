import { Injectable, Inject } from '@nestjs/common';
import { ethers } from 'ethers';
import { createPublicClient, http } from 'viem';
import { localhost } from 'viem/chains';
import configuration from '../config/configuration';
import logger from '../utils/logger';
import { BundlerService } from './BundlerService';
import { UserOperationRequest, UserOperation } from '../types/userOperation.type';
import { PasskeyService } from './passkey.service';
import { BlsSignatureService } from './bls.signature.service';

/**
 * 表示要执行的交易请求
 */
export interface TransactionRequest {
  to: string;
  value: string;
  data: string;
  operation?: number; // 0 for CALL, 1 for DELEGATECALL
}

@Injectable()
export class UserOperationService {
  private readonly publicClient;

  /**
   * 确保字符串有0x前缀并转换为正确的类型
   */
  private ensureHexPrefix(value: string | number): `0x${string}` {
    const hexString = typeof value === 'number' ? value.toString(16) : value.toString();
    return hexString.startsWith('0x') ? hexString as `0x${string}` : `0x${hexString}` as `0x${string}`;
  }

  constructor(
    @Inject(BundlerService) private readonly bundlerService: BundlerService,
    @Inject(PasskeyService) private readonly passkeyService: PasskeyService,
    @Inject(BlsSignatureService) private readonly blsSignatureService: BlsSignatureService
  ) {
    // 使用本地链配置
    const chainConfig = {
      ...localhost,
      id: configuration.ethereum.chainId
    };

    this.publicClient = createPublicClient({
      chain: chainConfig,
      transport: http(configuration.ethereum.rpcUrl)
    });
  }

  /**
   * 创建并签名用户操作（完整流程）
   * @param accountAddress 账户地址
   * @param txRequest 交易请求
   * @param paymasterEnabled 是否启用paymaster
   * @param passkeyVerification passkey验证数据
   * @param requiredNodeCount 需要的BLS节点数量
   * @returns 签名后的用户操作
   */
  async createAndSignUserOperation(
    accountAddress: string,
    txRequest: TransactionRequest,
    paymasterEnabled: boolean = false,
    passkeyVerification: {
      challenge: string;
      response: any;
      credentialPublicKey: Buffer;
      counter: number;
    },
    requiredNodeCount: number = 3
  ): Promise<UserOperationRequest> {
    try {
      logger.info(`创建并签名用户操作 - 账户: ${accountAddress}`);
      
      // 1. Passkey验证
      logger.info('1. 验证Passkey身份');
      const passkeyVerificationResult = await this.passkeyService.verifyAuthentication(
        passkeyVerification.response,
        passkeyVerification.challenge,
        passkeyVerification.credentialPublicKey,
        passkeyVerification.counter
      );
      
      if (!passkeyVerificationResult.verified) {
        throw new Error('Passkey验证失败');
      }
      logger.info('Passkey验证成功');

      // 2. 创建未签名的用户操作
      logger.info('2. 创建未签名的用户操作');
      const userOp = await this.createUserOperation(accountAddress, txRequest, paymasterEnabled);
      
      // 3. 使用BLS签名服务进行多节点签名
      logger.info('3. 执行BLS多节点签名流程');
      const aggregatedSignature = await this.blsSignatureService.signUserOperationWithMultipleNodes(
        userOp,
        requiredNodeCount
      );
      
      // 4. 将聚合签名添加到用户操作
      logger.info('4. 添加聚合签名到用户操作');
      userOp.signature = this.ensureHexPrefix(aggregatedSignature);
      
      logger.info(`用户操作签名完成: ${JSON.stringify(userOp)}`);
      return userOp;
    } catch (error) {
      logger.error(`创建并签名用户操作错误: ${error}`);
      throw new Error(`Failed to create and sign user operation: ${error.message}`);
    }
  }

  /**
   * 创建用户操作
   * @param accountAddress 账户地址
   * @param txRequest 交易请求
   * @param paymasterEnabled 是否启用Paymaster
   * @returns 未签名的用户操作
   */
  async createUserOperation(
    accountAddress: string,
    txRequest: TransactionRequest,
    paymasterEnabled: boolean = false
  ): Promise<UserOperationRequest> {
    try {
      logger.info(`Creating user operation for account: ${accountAddress}`);
      
      // 获取当前nonce
      const nonce = await this.getAccountNonce(accountAddress);
      
      // 构造callData (execute方法的调用)
      const callData = this.encodeExecuteCall(txRequest);
      
      // 初始估算gas值
      const callGasLimit = '100000';
      const verificationGasLimit = '100000';
      const preVerificationGas = '50000';
      
      // 获取当前gas价格
      const gasPrice = await this.bundlerService.provider.getFeeData();
      const maxFeePerGas = (gasPrice.maxFeePerGas || gasPrice.gasPrice || ethers.parseUnits('10', 'gwei')).toString();
      const maxPriorityFeePerGas = (gasPrice.maxPriorityFeePerGas || ethers.parseUnits('1', 'gwei')).toString();
      
      // 初始用户操作
      const userOp: UserOperationRequest = {
        sender: this.ensureHexPrefix(accountAddress),
        nonce: this.ensureHexPrefix(nonce),
        initCode: '0x' as `0x${string}`, // 已经部署的账户不需要initCode
        callData: this.ensureHexPrefix(callData),
        callGasLimit: this.ensureHexPrefix(callGasLimit),
        verificationGasLimit: this.ensureHexPrefix(verificationGasLimit),
        preVerificationGas: this.ensureHexPrefix(preVerificationGas),
        maxFeePerGas: this.ensureHexPrefix(maxFeePerGas),
        maxPriorityFeePerGas: this.ensureHexPrefix(maxPriorityFeePerGas),
        paymasterAndData: '0x' as `0x${string}`, // 默认不使用paymaster
        signature: this.generateTestSignature() // 使用测试签名
      };
      
      // 如果需要Paymaster，设置paymasterAndData
      if (paymasterEnabled && this.bundlerService.paymasterAddress !== '0x0000000000000000000000000000000000000000') {
        userOp.paymasterAndData = this.ensureHexPrefix(this.bundlerService.paymasterAddress);
      }
      
      // 估算gas费用
      const gasEstimation = await this.bundlerService.estimateUserOperationGas(userOp);
      userOp.callGasLimit = this.ensureHexPrefix(gasEstimation.callGasLimit);
      userOp.verificationGasLimit = this.ensureHexPrefix(gasEstimation.verificationGasLimit);
      userOp.preVerificationGas = this.ensureHexPrefix(gasEstimation.preVerificationGas);
      
      logger.info(`User operation created: ${JSON.stringify(userOp)}`);
      return userOp;
    } catch (error) {
      logger.error(`Error creating user operation: ${error}`);
      throw new Error(`Failed to create user operation: ${error}`);
    }
  }

  /**
   * 获取账户nonce
   * @param accountAddress 账户地址
   * @returns nonce
   */
  private async getAccountNonce(accountAddress: string): Promise<string> {
    try {
      // 使用bundlerService中的EntryPoint合约直接调用
      const nonce = await this.bundlerService.getNonce(accountAddress);
      logger.info(`获取到账户nonce: ${nonce}`);
      return nonce.toString();
    } catch (error) {
      logger.error(`Error getting account nonce: ${error}`);
      // 如果获取失败，默认返回0
      logger.warn('使用默认nonce: 0');
      return '0';
    }
  }

  /**
   * 编码execute调用
   * @param txRequest 交易请求
   * @returns 编码后的callData
   */
  private encodeExecuteCall(txRequest: TransactionRequest): string {
    // execute(address,uint256,bytes)
    const abiCoder = new ethers.AbiCoder();
    const executeSelector = '0xb61d27f6';
    
    const encodedCallData = abiCoder.encode(
      ['address', 'uint256', 'bytes'],
      [txRequest.to, txRequest.value, txRequest.data]
    );
    
    return executeSelector + encodedCallData.slice(2); // 去掉0x前缀
  }

  /**
   * 发送用户操作
   * @param userOp 签名后的用户操作
   * @returns 用户操作哈希
   */
  async sendUserOperation(userOp: UserOperationRequest): Promise<string> {
    try {
      // 将 UserOperationRequest 转换为 UserOperation
      const convertedUserOp: UserOperation = {
        sender: userOp.sender as `0x${string}`,
        nonce: BigInt(userOp.nonce),
        initCode: userOp.initCode as `0x${string}`,
        callData: userOp.callData as `0x${string}`,
        callGasLimit: BigInt(userOp.callGasLimit),
        verificationGasLimit: BigInt(userOp.verificationGasLimit),
        preVerificationGas: BigInt(userOp.preVerificationGas),
        maxFeePerGas: BigInt(userOp.maxFeePerGas),
        maxPriorityFeePerGas: BigInt(userOp.maxPriorityFeePerGas),
        paymasterAndData: userOp.paymasterAndData as `0x${string}`,
        signature: userOp.signature as `0x${string}`
      };

      return await this.bundlerService.sendUserOperation(convertedUserOp);
    } catch (error) {
      throw new Error(`Failed to send user operation: ${error.message}`);
    }
  }

  /**
   * 获取用户操作状态
   * @param hash 用户操作哈希
   * @returns 用户操作状态
   */
  async getUserOperationStatus(hash: string): Promise<any> {
    try {
      return await this.bundlerService.getUserOperationReceipt(hash);
    } catch (error) {
      throw new Error(`Failed to get user operation status: ${error.message}`);
    }
  }

  /**
   * 预估交易gas费用
   * @param accountAddress 账户地址
   * @param txRequest 交易请求
   * @param paymasterEnabled 是否启用Paymaster
   * @returns gas费用估算
   */
  async estimateTransactionGas(
    accountAddress: string,
    txRequest: TransactionRequest,
    paymasterEnabled: boolean = false
  ): Promise<any> {
    try {
      logger.info(`Estimating transaction gas for account: ${accountAddress}`);
      
      // 创建未签名的用户操作
      const userOp = await this.createUserOperation(accountAddress, txRequest, paymasterEnabled);
      
      // 估算gas费用
      const gasEstimation = await this.bundlerService.estimateUserOperationGas(userOp);
      
      // 计算总gas费用
      const totalGas = BigInt(gasEstimation.callGasLimit) + 
                       BigInt(gasEstimation.verificationGasLimit) + 
                       BigInt(gasEstimation.preVerificationGas);
      
      const totalGasCostWei = totalGas * BigInt(userOp.maxFeePerGas);
      const totalGasCostEth = ethers.formatEther(totalGasCostWei.toString());
      
      const result = {
        callGasLimit: gasEstimation.callGasLimit,
        verificationGasLimit: gasEstimation.verificationGasLimit,
        preVerificationGas: gasEstimation.preVerificationGas,
        totalGas: totalGas.toString(),
        maxFeePerGas: userOp.maxFeePerGas,
        totalGasCostWei: totalGasCostWei.toString(),
        totalGasCostEth
      };
      
      logger.info(`Gas estimation result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      logger.error(`Error estimating transaction gas: ${error}`);
      throw new Error(`Failed to estimate transaction gas: ${error}`);
    }
  }

  /**
   * 生成测试签名（用于开发环境）
   * 注意：这是测试签名，生产环境需要实现真正的BLS签名
   */
  private generateTestSignature(): `0x${string}` {
    // 为测试环境生成一个固定的有效签名
    // 这个签名长度应该符合账户合约的预期
    // 通常ERC-4337账户合约期望65字节的签名 (r:32字节 + s:32字节 + v:1字节)
    const r = '1'.repeat(64); // 32字节的r值
    const s = '2'.repeat(64); // 32字节的s值  
    const v = '1b'; // 1字节的v值 (27的十六进制)
    
    const testSignature = `0x${r}${s}${v}` as `0x${string}`; // 拼接0x+r+s+v
    
    logger.info(`生成测试签名: ${testSignature}`);
    return testSignature;
  }
} 