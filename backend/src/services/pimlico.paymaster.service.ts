import { Injectable } from '@nestjs/common';
import { JsonRpcProvider, formatEther } from 'ethers';
import axios from 'axios';
import config from '../config/config';
import { IPaymasterService, PaymasterResponse } from '../interfaces/paymaster.interface';
import { UserOperation } from '../types/userOperation.type';
import configuration from '@/config/configuration';

@Injectable()
export class PimlicoPaymasterService implements IPaymasterService {
  private readonly provider: JsonRpcProvider;
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor() {
    this.provider = new JsonRpcProvider(configuration.ethereum.rpcUrl);
    this.apiKey = configuration.paymaster.apiKey;
    this.baseUrl = configuration.paymaster.url;
  }

  private async makeRequest(method: string, params: any[]) {
    try {
      const response = await axios.post(
        this.baseUrl,
        {
          jsonrpc: '2.0',
          id: 1,
          method,
          params
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': this.apiKey
          }
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error.message);
      }

      return response.data;
    } catch (error) {
      throw new Error(`Pimlico API request failed: ${error.message}`);
    }
  }

  async getPaymasterSignature(userOp: UserOperation): Promise<PaymasterResponse> {
    try {
      const response = await this.makeRequest('pm_sponsorUserOperation', [
        userOp,
        configuration.ethereum.entryPointAddress
      ]);

      const result = response.result;
      return {
        paymasterAndData: result.paymasterAndData,
        preVerificationGas: result.preVerificationGas,
        verificationGasLimit: result.verificationGasLimit,
        callGasLimit: result.callGasLimit,
      };
    } catch (error) {
      console.error('Failed to get paymaster signature:', error);
      throw new Error('Failed to get paymaster signature');
    }
  }

  async verifyPaymasterStatus(): Promise<boolean> {
    try {
      const response = await this.makeRequest('pm_status', []);
      return response.result.status === 'active';
    } catch (error) {
      console.error('Failed to verify paymaster status:', error);
      return false;
    }
  }

  async getPaymasterBalance(): Promise<string> {
    try {
      const response = await this.makeRequest('pm_balance', []);
      return formatEther(response.result.balance);
    } catch (error) {
      console.error('Failed to get paymaster balance:', error);
      throw new Error('Failed to get paymaster balance');
    }
  }

  async getCurrentGasPrice(): Promise<string> {
    try {
      const feeData = await this.provider.getFeeData();
      return (feeData.gasPrice || feeData.maxFeePerGas || 0).toString();
    } catch (error) {
      console.error('Failed to get current gas price:', error);
      throw new Error('Failed to get current gas price');
    }
  }

  async getBalance(): Promise<string> {
    try {
      const response = await this.makeRequest('pm_accountBalance', []);
      return formatEther(response.result.balance);
    } catch (error) {
      throw new Error(`Failed to get paymaster balance: ${error.message}`);
    }
  }
}