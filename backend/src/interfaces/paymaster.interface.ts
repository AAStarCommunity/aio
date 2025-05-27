import { UserOperation } from '../types/userOperation.type';

export interface PaymasterResponse {
  paymasterAndData: string;
  preVerificationGas: string;
  verificationGasLimit: string;
  callGasLimit: string;
}

export interface IPaymasterService {
  // 获取paymaster签名数据
  getPaymasterSignature(userOp: UserOperation): Promise<PaymasterResponse>;
  
  // 验证paymaster状态
  verifyPaymasterStatus(): Promise<boolean>;
  
  // 获取paymaster余额
  getPaymasterBalance(): Promise<string>;
  
  // 获取当前gas价格
  getCurrentGasPrice(): Promise<string>;
} 