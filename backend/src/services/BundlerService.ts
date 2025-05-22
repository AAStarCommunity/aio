import { ethers } from 'ethers';
import axios from 'axios';
import { createPublicClient, http, createWalletClient, Account } from 'viem';
import { sepolia } from 'viem/chains';
import { Bundler, BundlerActions, UserOperation, createBundlerClient } from 'permissionless';
import { createPimlicoBundlerClient, createSmartAccountClient } from 'permissionless/clients';
import config from '../config/config';
import logger from '../utils/logger';

// 用户操作类型
export interface UserOperationRequest {
  sender: string;
  nonce: string;
  initCode: string;
  callData: string;
  callGasLimit: string;
  verificationGasLimit: string;
  preVerificationGas: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  paymasterAndData: string;
  signature: string;
}

/**
 * Bundler服务接口
 */
export interface IBundlerService {
  /**
   * 发送用户操作到Bundler
   * @param userOp 用户操作
   * @returns 用户操作哈希
   */
  sendUserOperation(userOp: UserOperationRequest): Promise<string>;

  /**
   * 获取用户操作状态
   * @param userOpHash 用户操作哈希
   * @returns 用户操作状态
   */
  getUserOperationStatus(userOpHash: string): Promise<any>;

  /**
   * 获取Bundler支持的链ID
   * @returns 支持的链ID列表
   */
  getSupportedChainIds(): Promise<number[]>;

  /**
   * 获取Bundler支持的入口点合约地址
   * @returns 支持的入口点合约地址列表
   */
  getSupportedEntryPoints(): Promise<string[]>;

  /**
   * 估算用户操作的gas费用
   * @param userOp 用户操作
   * @returns gas费用估算结果
   */
  estimateUserOperationGas(userOp: UserOperationRequest): Promise<any>;
}

/**
 * Pimlico Bundler服务实现
 */
export class PimlicoBundlerService implements IBundlerService {
  private readonly entryPointAddress: string;
  private readonly chainId: number;
  private readonly apiKey: string;
  private readonly bundlerUrl: string;
  private bundlerClient: Bundler;

  constructor() {
    this.entryPointAddress = config.ethereum.entryPointAddress;
    this.chainId = config.ethereum.chainId;
    this.apiKey = config.bundler.pimlico.apiKey;
    this.bundlerUrl = config.bundler.pimlico.url;

    // 创建Pimlico Bundler客户端
    this.bundlerClient = createPimlicoBundlerClient({
      chain: sepolia,
      transport: http(`${this.bundlerUrl}?apikey=${this.apiKey}`),
      entryPoint: this.entryPointAddress as `0x${string}`,
    });
  }

  async sendUserOperation(userOp: UserOperationRequest): Promise<string> {
    try {
      logger.info(`Sending user operation to Pimlico Bundler: ${JSON.stringify(userOp)}`);

      // 将UserOperationRequest转换为UserOperation格式
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

      // 调用Pimlico API提交用户操作
      const userOpHash = await this.bundlerClient.sendUserOperation({
        userOperation: convertedUserOp,
        entryPoint: this.entryPointAddress as `0x${string}`
      });

      logger.info(`User operation sent successfully, hash: ${userOpHash}`);
      return userOpHash;
    } catch (error) {
      logger.error(`Error sending user operation to Pimlico: ${error}`);
      throw new Error(`Failed to send user operation: ${error}`);
    }
  }

  async getUserOperationStatus(userOpHash: string): Promise<any> {
    try {
      logger.info(`Getting user operation status from Pimlico, hash: ${userOpHash}`);
      
      const receipt = await this.bundlerClient.getUserOperationReceipt({
        hash: userOpHash as `0x${string}`
      });
      
      logger.info(`User operation status retrieved successfully: ${JSON.stringify(receipt)}`);
      return receipt;
    } catch (error) {
      logger.error(`Error getting user operation status from Pimlico: ${error}`);
      throw new Error(`Failed to get user operation status: ${error}`);
    }
  }

  async getSupportedChainIds(): Promise<number[]> {
    try {
      logger.info('Getting supported chain IDs from Pimlico');
      
      // 此处使用HTTP请求获取Pimlico支持的链
      const response = await axios.get('https://api.pimlico.io/v1/supported_networks');
      const chains = response.data.chains || [];
      
      logger.info(`Supported chain IDs retrieved successfully: ${JSON.stringify(chains)}`);
      return chains.map((chain: any) => chain.chainId);
    } catch (error) {
      logger.error(`Error getting supported chain IDs from Pimlico: ${error}`);
      throw new Error(`Failed to get supported chain IDs: ${error}`);
    }
  }

  async getSupportedEntryPoints(): Promise<string[]> {
    try {
      logger.info('Getting supported entry points from Pimlico');
      
      const entryPoints = await this.bundlerClient.supportedEntryPoints();
      
      logger.info(`Supported entry points retrieved successfully: ${JSON.stringify(entryPoints)}`);
      return entryPoints;
    } catch (error) {
      logger.error(`Error getting supported entry points from Pimlico: ${error}`);
      throw new Error(`Failed to get supported entry points: ${error}`);
    }
  }

  async estimateUserOperationGas(userOp: UserOperationRequest): Promise<any> {
    try {
      logger.info(`Estimating gas for user operation: ${JSON.stringify(userOp)}`);
      
      // 将UserOperationRequest转换为UserOperation格式
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
      
      const gasEstimation = await this.bundlerClient.estimateUserOperationGas({
        userOperation: convertedUserOp,
        entryPoint: this.entryPointAddress as `0x${string}`
      });
      
      logger.info(`Gas estimation completed: ${JSON.stringify(gasEstimation)}`);
      return {
        preVerificationGas: gasEstimation.preVerificationGas.toString(),
        verificationGasLimit: gasEstimation.verificationGasLimit.toString(),
        callGasLimit: gasEstimation.callGasLimit.toString()
      };
    } catch (error) {
      logger.error(`Error estimating gas for user operation: ${error}`);
      throw new Error(`Failed to estimate gas: ${error}`);
    }
  }
}

/**
 * Stackup Bundler服务实现
 */
export class StackupBundlerService implements IBundlerService {
  private readonly entryPointAddress: string;
  private readonly chainId: number;
  private readonly apiKey: string;
  private readonly bundlerUrl: string;

  constructor() {
    this.entryPointAddress = config.ethereum.entryPointAddress;
    this.chainId = config.ethereum.chainId;
    this.apiKey = config.bundler.stackup.apiKey;
    this.bundlerUrl = config.bundler.stackup.url;
  }

  async sendUserOperation(userOp: UserOperationRequest): Promise<string> {
    try {
      logger.info(`Sending user operation to Stackup Bundler: ${JSON.stringify(userOp)}`);
      
      // 构建JSON-RPC请求
      const response = await axios.post(
        this.bundlerUrl,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_sendUserOperation',
          params: [userOp, this.entryPointAddress]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      
      const userOpHash = response.data.result;
      logger.info(`User operation sent successfully, hash: ${userOpHash}`);
      return userOpHash;
    } catch (error) {
      logger.error(`Error sending user operation to Stackup: ${error}`);
      throw new Error(`Failed to send user operation: ${error}`);
    }
  }

  async getUserOperationStatus(userOpHash: string): Promise<any> {
    try {
      logger.info(`Getting user operation status from Stackup, hash: ${userOpHash}`);
      
      // 构建JSON-RPC请求
      const response = await axios.post(
        this.bundlerUrl,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_getUserOperationReceipt',
          params: [userOpHash]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      
      logger.info(`User operation status retrieved successfully: ${JSON.stringify(response.data.result)}`);
      return response.data.result;
    } catch (error) {
      logger.error(`Error getting user operation status from Stackup: ${error}`);
      throw new Error(`Failed to get user operation status: ${error}`);
    }
  }

  async getSupportedChainIds(): Promise<number[]> {
    // Stackup暂不提供此API，返回当前配置的链ID
    return [this.chainId];
  }

  async getSupportedEntryPoints(): Promise<string[]> {
    try {
      logger.info('Getting supported entry points from Stackup');
      
      // 构建JSON-RPC请求
      const response = await axios.post(
        this.bundlerUrl,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_supportedEntryPoints',
          params: []
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      
      logger.info(`Supported entry points retrieved successfully: ${JSON.stringify(response.data.result)}`);
      return response.data.result;
    } catch (error) {
      logger.error(`Error getting supported entry points from Stackup: ${error}`);
      throw new Error(`Failed to get supported entry points: ${error}`);
    }
  }

  async estimateUserOperationGas(userOp: UserOperationRequest): Promise<any> {
    try {
      logger.info(`Estimating gas for user operation: ${JSON.stringify(userOp)}`);
      
      // 构建JSON-RPC请求
      const response = await axios.post(
        this.bundlerUrl,
        {
          jsonrpc: '2.0',
          id: 1,
          method: 'eth_estimateUserOperationGas',
          params: [userOp, this.entryPointAddress]
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`
          }
        }
      );
      
      if (response.data.error) {
        throw new Error(response.data.error.message);
      }
      
      logger.info(`Gas estimation completed: ${JSON.stringify(response.data.result)}`);
      return response.data.result;
    } catch (error) {
      logger.error(`Error estimating gas for user operation: ${error}`);
      throw new Error(`Failed to estimate gas: ${error}`);
    }
  }
}

/**
 * Bundler服务工厂
 */
export class BundlerServiceFactory {
  /**
   * 创建Bundler服务实例
   * @param provider Bundler提供商名称
   * @returns Bundler服务实例
   */
  static createBundlerService(provider?: 'pimlico' | 'stackup'): IBundlerService {
    const activeProvider = provider || config.bundler.activeProvider;
    
    switch (activeProvider) {
      case 'pimlico':
        return new PimlicoBundlerService();
      case 'stackup':
        return new StackupBundlerService();
      default:
        logger.warn(`Unknown bundler provider: ${activeProvider}, falling back to Pimlico`);
        return new PimlicoBundlerService();
    }
  }
} 