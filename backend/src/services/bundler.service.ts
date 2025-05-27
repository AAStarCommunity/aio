import { ethers } from 'ethers';
import { UserOperation } from '../types/userOperation';
import logger from '../utils/logger';

export class BundlerService {
  private provider: ethers.JsonRpcProvider;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(process.env.BUNDLER_URL || 'http://localhost:3000');
  }

  async getNonce(address: string): Promise<string> {
    try {
      return await this.provider.send('eth_getUserOperationNonce', [address]);
    } catch (error) {
      logger.error('Failed to get nonce:', error);
      throw error;
    }
  }

  async estimateUserOperationGas(userOp: UserOperation): Promise<{
    callGasLimit: string;
    verificationGasLimit: string;
    preVerificationGas: string;
  }> {
    try {
      return await this.provider.send('eth_estimateUserOperationGas', [userOp]);
    } catch (error) {
      logger.error('Failed to estimate gas:', error);
      throw error;
    }
  }

  async getGasFees(): Promise<{
    maxFeePerGas: string;
    maxPriorityFeePerGas: string;
  }> {
    try {
      return await this.provider.send('eth_getGasFees', []);
    } catch (error) {
      logger.error('Failed to get gas fees:', error);
      throw error;
    }
  }

  async sendUserOperation(userOp: UserOperation): Promise<string> {
    try {
      return await this.provider.send('eth_sendUserOperation', [userOp]);
    } catch (error) {
      logger.error('Failed to send user operation:', error);
      throw error;
    }
  }
} 