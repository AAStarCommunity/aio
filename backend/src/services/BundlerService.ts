import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { UserOperation, UserOperationRequest } from '../types/userOperation.type';
import configuration from '../config/configuration';
import logger from '../utils/logger';

@Injectable()
export class BundlerService {
  public readonly provider: ethers.JsonRpcProvider;
  public readonly entryPointAddress: string;
  public readonly paymasterAddress: string;
  private readonly bundlerUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(configuration.ethereum.rpcUrl);
    this.entryPointAddress = configuration.ethereum.entryPointAddress;
    this.paymasterAddress = configuration.ethereum.paymasterAddress;
    this.bundlerUrl = configuration.bundler.url;
    this.apiKey = configuration.bundler.apiKey;

    logger.info(`BundlerService 初始化完成 - 使用标准ERC-4337 Bundler`);
    logger.info(`Bundler URL: ${this.bundlerUrl}`);
    logger.info(`API Key: ${this.apiKey ? '***已设置***' : '未设置'}`);
    logger.info(`EntryPoint: ${this.entryPointAddress}`);
  }

  /**
   * 使用标准bundler RPC发送用户操作
   */
  async sendUserOperation(userOp: UserOperation): Promise<string> {
    try {
      logger.info(`发送用户操作到bundler`, { userOp });
      
      // 构造标准的用户操作结构，将BigInt转换为字符串
      const userOpForBundler = {
        sender: userOp.sender,
        nonce: this.toHexString(userOp.nonce),
        initCode: userOp.initCode,
        callData: userOp.callData,
        callGasLimit: this.toHexString(userOp.callGasLimit),
        verificationGasLimit: this.toHexString(userOp.verificationGasLimit),
        preVerificationGas: this.toHexString(userOp.preVerificationGas),
        maxFeePerGas: this.toHexString(userOp.maxFeePerGas),
        maxPriorityFeePerGas: this.toHexString(userOp.maxPriorityFeePerGas),
        paymasterAndData: userOp.paymasterAndData,
        signature: userOp.signature
      };

      // 调用标准的bundler RPC方法
      const userOpHash = await this.callBundlerRPC('eth_sendUserOperation', [
        userOpForBundler,
        this.entryPointAddress
      ]);

      logger.info(`用户操作已发送到bundler，哈希: ${userOpHash}`);
      return userOpHash;
    } catch (error) {
      logger.error(`bundler发送用户操作失败: ${error.message}`);
      throw new Error(`Failed to send user operation via bundler: ${error.message}`);
    }
  }

  /**
   * 估算用户操作gas费用
   */
  async estimateUserOperationGas(userOp: UserOperationRequest): Promise<{
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
  }> {
    try {
      logger.info(`bundler估算用户操作gas`, { userOp });
      
      const userOpForEstimate = {
        sender: userOp.sender,
        nonce: userOp.nonce,
        initCode: userOp.initCode,
        callData: userOp.callData,
        callGasLimit: userOp.callGasLimit || '0x30d40',
        verificationGasLimit: userOp.verificationGasLimit || '0x493e0',
        preVerificationGas: userOp.preVerificationGas || '0xc350',
        maxFeePerGas: userOp.maxFeePerGas || '0x59682f00',
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas || '0x59682f00',
        paymasterAndData: userOp.paymasterAndData,
        signature: userOp.signature || '0x'
      };

      const gasEstimate = await this.callBundlerRPC('eth_estimateUserOperationGas', [
        userOpForEstimate,
        this.entryPointAddress
      ]);

      logger.info(`bundler返回gas估算结果`, { gasEstimate });
      return gasEstimate;
    } catch (error) {
      logger.error(`bundler估算gas失败: ${error.message}`);
      
      // 如果bundler估算失败，返回默认值
      logger.warn('使用默认gas估算值');
      return {
        callGasLimit: '0x30d40', // 200000
        verificationGasLimit: '0x493e0', // 300000
        preVerificationGas: '0xc350' // 50000
      };
    }
  }

  /**
   * 获取用户操作收据
   */
  async getUserOperationReceipt(userOpHash: string) {
    try {
      logger.info(`获取用户操作收据: ${userOpHash}`);
      
      const receipt = await this.callBundlerRPC('eth_getUserOperationReceipt', [userOpHash]);
      
      logger.info(`获取到用户操作收据`, { receipt });
      return receipt;
    } catch (error) {
      logger.error(`获取用户操作收据失败: ${error.message}`);
      throw new Error(`Failed to get user operation receipt: ${error.message}`);
    }
  }

  /**
   * 获取账户nonce
   */
  async getNonce(sender: string, key: bigint = BigInt(0)): Promise<bigint> {
    try {
      logger.info(`获取账户nonce: ${sender}`);
      
      // 首先尝试使用bundler的标准方法
      try {
        const nonce = await this.callBundlerRPC('eth_getUserOperationNonce', [
          sender,
          this.entryPointAddress
        ]);
        logger.info(`bundler返回账户nonce: ${nonce}`);
        return BigInt(nonce);
      } catch (bundlerError) {
        logger.warn(`bundler获取nonce失败，使用直接RPC调用: ${bundlerError.message}`);
        
        // 如果bundler方法失败，直接调用EntryPoint
        const callData = '0xfc7e286d' + // getNonce函数选择器
          sender.slice(2).padStart(64, '0') + // sender地址参数
          key.toString(16).padStart(48, '0'); // key参数(uint192)
        
        const result = await this.provider.call({
          to: this.entryPointAddress,
          data: callData
        });
        
        const nonce = BigInt(result);
        logger.info(`直接RPC获取账户nonce: ${nonce}`);
        return nonce;
      }
    } catch (error) {
      logger.error(`获取账户nonce失败: ${error.message}`);
      throw new Error(`Failed to get account nonce: ${error.message}`);
    }
  }

  /**
   * 获取用户操作状态
   */
  async getUserOperationStatus(userOpHash: string) {
    try {
      logger.info(`获取用户操作状态: ${userOpHash}`);
      
      const receipt = await this.getUserOperationReceipt(userOpHash);
      
      if (receipt && receipt.receipt) {
        return {
          status: receipt.receipt.status === '0x1' ? 'success' : 'failed',
          receipt: receipt.receipt
        };
      } else {
        return {
          status: 'pending',
          receipt: null
        };
      }
    } catch (error) {
      logger.error(`获取用户操作状态失败: ${error.message}`);
      return {
        status: 'pending',
        receipt: null
      };
    }
  }

  /**
   * 调用bundler RPC方法
   */
  private async callBundlerRPC(method: string, params: any[]): Promise<any> {
    try {
      const requestBody = {
        jsonrpc: '2.0',
        method,
        params,
        id: Date.now()
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // 如果有API密钥，添加到请求头
      if (this.apiKey && this.apiKey !== 'pim_test_key') {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      logger.info(`调用bundler RPC: ${method}`, { params });

      const response = await fetch(this.bundlerUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`Bundler RPC请求失败: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(`Bundler RPC错误: ${result.error.message}`);
      }

      logger.info(`bundler RPC响应: ${method}`, { result: result.result });
      return result.result;
    } catch (error) {
      logger.error(`bundler RPC调用失败: ${method}`, { error: error.message });
      throw error;
    }
  }

  /**
   * 获取paymaster数据
   */
  async getPaymasterData(userOp: UserOperation) {
    try {
      logger.info(`获取paymaster数据 - 使用自付费模式`);
      
      // 在本地测试环境中，暂时不使用paymaster
      return {
        paymasterAndData: '0x',
        preVerificationGas: '0xc350',
        verificationGasLimit: '0x493e0',
        callGasLimit: '0x30d40'
      };
    } catch (error) {
      logger.error(`获取paymaster数据失败: ${error.message}`);
      throw new Error(`Failed to get paymaster data: ${error.message}`);
    }
  }

  /**
   * 获取用户操作哈希
   */
  async getUserOpHash(userOp: UserOperation): Promise<string> {
    try {
      // 尝试使用bundler方法
      const hash = await this.callBundlerRPC('eth_getUserOperationHash', [
        userOp,
        this.entryPointAddress
      ]);
      
      logger.info(`用户操作哈希: ${hash}`);
      return hash;
    } catch (error) {
      logger.error(`获取用户操作哈希失败: ${error.message}`);
      throw new Error(`Failed to get user operation hash: ${error.message}`);
    }
  }

  /**
   * 将BigInt或字符串转换为十六进制字符串
   */
  private toHexString(value: bigint | string): string {
    if (typeof value === 'bigint') {
      return '0x' + value.toString(16);
    } else if (typeof value === 'string') {
      // 如果已经是0x开头的字符串，直接返回
      if (value.startsWith('0x')) {
        return value;
      }
      // 如果是数字字符串，转换为BigInt再转换为十六进制
      return '0x' + BigInt(value).toString(16);
    } else {
      throw new Error(`Invalid input type: ${typeof value}`);
    }
  }
} 