import axios from 'axios';
import { IPaymasterService, PaymasterResponse } from '../interfaces/paymaster.interface';
import { UserOperation } from '../types/userOperation.type';
import { config } from '../config';
import { ethers } from 'ethers';

export class PimlicoPaymasterService implements IPaymasterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly provider: ethers.providers.JsonRpcProvider;

  constructor() {
    this.apiKey = config.PIMLICO_API_KEY;
    this.baseUrl = `https://api.pimlico.io/v1/${config.CHAIN_ID}`;
    this.provider = new ethers.providers.JsonRpcProvider(config.RPC_URL);
  }

  async getPaymasterSignature(userOp: UserOperation): Promise<PaymasterResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/paymaster/sponsorUserOperation`,
        {
          userOperation: userOp,
          entryPoint: config.ENTRY_POINT_ADDRESS,
        },
        {
          headers: {
            'x-api-key': this.apiKey,
          },
        }
      );

      return {
        paymasterAndData: response.data.paymasterAndData,
        preVerificationGas: response.data.preVerificationGas,
        verificationGasLimit: response.data.verificationGasLimit,
        callGasLimit: response.data.callGasLimit,
      };
    } catch (error) {
      console.error('Failed to get paymaster signature:', error);
      throw new Error('Failed to get paymaster signature');
    }
  }

  async verifyPaymasterStatus(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/status`, {
        headers: {
          'x-api-key': this.apiKey,
        },
      });
      return response.data.status === 'active';
    } catch (error) {
      console.error('Failed to verify paymaster status:', error);
      return false;
    }
  }

  async getPaymasterBalance(): Promise<string> {
    try {
      const response = await axios.get(`${this.baseUrl}/balance`, {
        headers: {
          'x-api-key': this.apiKey,
        },
      });
      return ethers.utils.formatEther(response.data.balance);
    } catch (error) {
      console.error('Failed to get paymaster balance:', error);
      throw new Error('Failed to get paymaster balance');
    }
  }

  async getCurrentGasPrice(): Promise<string> {
    try {
      const gasPrice = await this.provider.getGasPrice();
      return gasPrice.toString();
    } catch (error) {
      console.error('Failed to get current gas price:', error);
      throw new Error('Failed to get current gas price');
    }
  }
} 