import { Injectable } from '@nestjs/common';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { UserOperation, UserOperationRequest } from '../types/userOperation.type';
import configuration from '../config/configuration';
import logger from '../utils/logger';
import { JsonRpcProvider } from 'ethers';
import axios from 'axios';

@Injectable()
export class BundlerService {
  private readonly publicClient;
  public readonly provider: JsonRpcProvider;
  public readonly entryPointAddress: string;
  public readonly paymasterAddress: string;
  private readonly bundlerUrl: string;
  private readonly apiKey: string;

  constructor() {
    // 创建公共客户端
    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(configuration.ethereum.rpcUrl)
    });

    this.provider = new JsonRpcProvider(configuration.ethereum.rpcUrl);
    this.entryPointAddress = configuration.ethereum.entryPointAddress;
    this.paymasterAddress = configuration.ethereum.paymasterAddress;
    this.bundlerUrl = configuration.bundler.url;
    this.apiKey = configuration.bundler.apiKey;

    logger.info(`BundlerService 初始化完成`);
    logger.info(`Bundler URL: ${this.bundlerUrl}`);
    logger.info(`EntryPoint: ${this.entryPointAddress}`);
  }

  private async makeRpcRequest(method: string, params: any[]) {
    const url = `${this.bundlerUrl}?apikey=${this.apiKey}`;
    
    const requestBody = {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params
    };

    try {
      logger.info(`发送RPC请求: ${method}`, { params });
      
      const response = await axios.post(url, requestBody, {
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data.error) {
        throw new Error(`RPC error: ${response.data.error.message}`);
      }

      logger.info(`RPC响应: ${method}`, { result: response.data.result });
      return response.data.result;
    } catch (error) {
      logger.error(`RPC请求失败: ${method}`, { error: error.message });
      throw error;
    }
  }

  async sendUserOperation(userOp: UserOperation) {
    try {
      logger.info(`发送用户操作到bundler`, { userOp });
      
      // 转换BigInt为字符串
      const userOpFormatted = {
        sender: userOp.sender,
        nonce: `0x${userOp.nonce.toString(16)}`,
        initCode: userOp.initCode,
        callData: userOp.callData,
        callGasLimit: `0x${userOp.callGasLimit.toString(16)}`,
        verificationGasLimit: `0x${userOp.verificationGasLimit.toString(16)}`,
        preVerificationGas: `0x${userOp.preVerificationGas.toString(16)}`,
        maxFeePerGas: `0x${userOp.maxFeePerGas.toString(16)}`,
        maxPriorityFeePerGas: `0x${userOp.maxPriorityFeePerGas.toString(16)}`,
        paymasterAndData: userOp.paymasterAndData,
        signature: userOp.signature
      };
      
      const userOpHash = await this.makeRpcRequest('eth_sendUserOperation', [
        userOpFormatted,
        this.entryPointAddress
      ]);
      
      logger.info(`用户操作已发送，哈希: ${userOpHash}`);
      return userOpHash;
    } catch (error) {
      logger.error(`发送用户操作失败: ${error.message}`);
      throw new Error(`Failed to send user operation: ${error.message}`);
    }
  }

  async getUserOperationReceipt(hash: string) {
    try {
      logger.info(`获取用户操作收据: ${hash}`);
      
      const receipt = await this.makeRpcRequest('eth_getUserOperationReceipt', [hash]);
      
      logger.info(`获取到用户操作收据`, { receipt });
      return receipt;
    } catch (error) {
      logger.error(`获取用户操作收据失败: ${error.message}`);
      throw new Error(`Failed to get user operation receipt: ${error.message}`);
    }
  }

  async estimateUserOperationGas(userOp: UserOperationRequest) {
    try {
      logger.info(`估算用户操作gas`, { userOp });
      
      // 转换为正确的格式
      const userOpFormatted = {
        sender: userOp.sender,
        nonce: userOp.nonce,
        initCode: userOp.initCode,
        callData: userOp.callData,
        callGasLimit: userOp.callGasLimit,
        verificationGasLimit: userOp.verificationGasLimit,
        preVerificationGas: userOp.preVerificationGas,
        maxFeePerGas: userOp.maxFeePerGas,
        maxPriorityFeePerGas: userOp.maxPriorityFeePerGas,
        paymasterAndData: userOp.paymasterAndData,
        signature: userOp.signature
      };

      const gasEstimation = await this.makeRpcRequest('eth_estimateUserOperationGas', [
        userOpFormatted,
        this.entryPointAddress
      ]);

      const result = {
        callGasLimit: gasEstimation.callGasLimit,
        verificationGasLimit: gasEstimation.verificationGasLimit,
        preVerificationGas: gasEstimation.preVerificationGas
      };

      logger.info(`Gas估算结果`, { result });
      return result;
    } catch (error) {
      logger.error(`估算用户操作gas失败: ${error.message}`);
      
      // 如果估算失败，返回默认值
      logger.warn('使用默认gas值');
      return {
        callGasLimit: '0x30d40', // 200000
        verificationGasLimit: '0x493e0', // 300000
        preVerificationGas: '0xc350' // 50000
      };
    }
  }

  // 获取paymaster数据（如果需要赞助gas）
  async getPaymasterData(userOp: UserOperation) {
    try {
      logger.info(`获取paymaster数据`);
      
      // 转换BigInt为字符串
      const userOpFormatted = {
        sender: userOp.sender,
        nonce: `0x${userOp.nonce.toString(16)}`,
        initCode: userOp.initCode,
        callData: userOp.callData,
        callGasLimit: `0x${userOp.callGasLimit.toString(16)}`,
        verificationGasLimit: `0x${userOp.verificationGasLimit.toString(16)}`,
        preVerificationGas: `0x${userOp.preVerificationGas.toString(16)}`,
        maxFeePerGas: `0x${userOp.maxFeePerGas.toString(16)}`,
        maxPriorityFeePerGas: `0x${userOp.maxPriorityFeePerGas.toString(16)}`,
        paymasterAndData: userOp.paymasterAndData,
        signature: userOp.signature
      };
      
      const paymasterResult = await this.makeRpcRequest('pm_sponsorUserOperation', [
        userOpFormatted,
        this.entryPointAddress
      ]);

      logger.info(`Paymaster数据获取成功`);
      return paymasterResult;
    } catch (error) {
      logger.error(`获取paymaster数据失败: ${error.message}`);
      throw new Error(`Failed to get paymaster data: ${error.message}`);
    }
  }

  // 获取用户操作状态
  async getUserOperationStatus(hash: string) {
    try {
      logger.info(`获取用户操作状态: ${hash}`);
      
      const status = await this.makeRpcRequest('pimlico_getUserOperationStatus', [hash]);
      
      logger.info(`用户操作状态`, { status });
      return status;
    } catch (error) {
      logger.error(`获取用户操作状态失败: ${error.message}`);
      throw new Error(`Failed to get user operation status: ${error.message}`);
    }
  }
} 