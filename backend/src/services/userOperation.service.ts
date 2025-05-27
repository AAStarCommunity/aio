import { BundlerService } from './bundler.service';
import { UserOperation } from '../types/userOperation';
import logger from '../utils/logger';

export class UserOperationService {
  constructor(private bundlerService: BundlerService) {}

  async createUserOperation(
    to: string,
    value: string,
    data: string
  ): Promise<UserOperation> {
    try {
      const nonce = await this.bundlerService.getNonce(to);
      const gasLimits = await this.bundlerService.estimateUserOperationGas({
        sender: to,
        nonce,
        initCode: '0x',
        callData: data,
        callGasLimit: '0x0',
        verificationGasLimit: '0x0',
        preVerificationGas: '0x0',
        maxFeePerGas: '0x0',
        maxPriorityFeePerGas: '0x0',
        paymasterAndData: '0x',
        signature: '0x'
      });
      const gasFees = await this.bundlerService.getGasFees();

      return {
        sender: to,
        nonce,
        initCode: '0x',
        callData: data,
        callGasLimit: gasLimits.callGasLimit,
        verificationGasLimit: gasLimits.verificationGasLimit,
        preVerificationGas: gasLimits.preVerificationGas,
        maxFeePerGas: gasFees.maxFeePerGas,
        maxPriorityFeePerGas: gasFees.maxPriorityFeePerGas,
        paymasterAndData: '0x',
        signature: '0x'
      };
    } catch (error) {
      logger.error('Failed to create user operation:', error);
      throw error;
    }
  }

  async sendUserOperation(userOp: UserOperation): Promise<string> {
    try {
      return await this.bundlerService.sendUserOperation(userOp);
    } catch (error) {
      logger.error('Failed to send user operation:', error);
      throw error;
    }
  }
} 