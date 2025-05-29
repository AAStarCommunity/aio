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

    this.smartAccountClient = createSmartAccountClient({
      chain: sepolia,
      transport: http(configuration.ethereum.rpcUrl),
      account: configuration.ethereum.entryPointAddress as `0x${string}`,
    });

    this.provider = new JsonRpcProvider(configuration.ethereum.rpcUrl);
    this.entryPointAddress = configuration.ethereum.entryPointAddress;
    this.paymasterAddress = configuration.ethereum.paymasterAddress;
  }

  async sendUserOperation(userOp: UserOperation) {
    try {
      const hash = await this.smartAccountClient.sendUserOperation({
        userOperation: userOp,
      });
      
      return hash;
    } catch (error) {
      throw new Error(`Failed to send user operation: ${error.message}`);
    }
  }

  async getUserOperationReceipt(hash: string) {
    try {
      const receipt = await this.smartAccountClient.getUserOperationReceipt({
        hash: hash as `0x${string}`,
      });
      
      return receipt;
    } catch (error) {
      throw new Error(`Failed to get user operation receipt: ${error.message}`);
    }
  }

  async estimateUserOperationGas(userOp: UserOperationRequest) {
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

      const estimation = await this.smartAccountClient.estimateUserOperationGas({
        userOperation: convertedUserOp,
      });

      return {
        callGasLimit: estimation.callGasLimit.toString(),
        verificationGasLimit: estimation.verificationGasLimit.toString(),
        preVerificationGas: estimation.preVerificationGas.toString()
      };
    } catch (error) {
      throw new Error(`Failed to estimate user operation gas: ${error.message}`);
    }
  }
} 