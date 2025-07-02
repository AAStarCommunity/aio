import { Injectable } from '@nestjs/common';
import { createPublicClient, http, createWalletClient, Account } from 'viem';
import { sepolia } from 'viem/chains';
import { createSmartAccountClient } from 'permissionless';
import { UserOperation, UserOperationRequest } from '../types/userOperation.type';
import configuration from '../config/configuration';
import logger from '../utils/logger';
import { JsonRpcProvider } from 'ethers';

@Injectable()
export class BundlerService {
  private readonly publicClient;
  private readonly smartAccountClient;
  public readonly provider: JsonRpcProvider;
  public readonly entryPointAddress: string;
  public readonly paymasterAddress: string;

  constructor() {
    this.publicClient = createPublicClient({
      chain: sepolia,
      transport: http(configuration.ethereum.rpcUrl)
    });

    // 暂时注释掉，直接使用HTTP请求发送用户操作
    // this.smartAccountClient = createSmartAccountClient({
    //   chain: sepolia,
    //   transport: http(configuration.ethereum.rpcUrl),
    // });

    this.provider = new JsonRpcProvider(configuration.ethereum.rpcUrl);
    this.entryPointAddress = configuration.ethereum.entryPointAddress;
    this.paymasterAddress = configuration.ethereum.paymasterAddress;
  }

  async sendUserOperation(userOp: UserOperation) {
    try {
      // 暂时返回模拟的交易哈希，实际应该发送到bundler
      logger.info(`模拟发送用户操作: ${JSON.stringify(userOp)}`);
      const mockHash = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;
      
      return mockHash;
    } catch (error) {
      throw new Error(`Failed to send user operation: ${error.message}`);
    }
  }

  async getUserOperationReceipt(hash: string) {
    try {
      // 暂时返回模拟的收据
      logger.info(`获取用户操作收据: ${hash}`);
      return {
        userOpHash: hash,
        status: 'success',
        blockNumber: 12345,
        transactionHash: hash,
        gasUsed: '21000'
      };
    } catch (error) {
      throw new Error(`Failed to get user operation receipt: ${error.message}`);
    }
  }

  async estimateUserOperationGas(userOp: UserOperationRequest) {
    try {
      // 暂时返回模拟的gas估算
      logger.info(`估算用户操作gas: ${JSON.stringify(userOp)}`);
      
      return {
        callGasLimit: '150000',
        verificationGasLimit: '200000',
        preVerificationGas: '50000'
      };
    } catch (error) {
      throw new Error(`Failed to estimate user operation gas: ${error.message}`);
    }
  }
} 