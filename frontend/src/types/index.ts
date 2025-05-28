// 用户相关类型
export interface User {
  email: string;
  aaAddress: string;
  createdAt: string;
}

// 交易相关类型
export interface Transaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  status: 'pending' | 'success' | 'failed';
  timestamp: string;
  gasUsed?: string;
  error?: string;
}

// API响应类型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// 用户操作类型
export interface UserOperation {
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

// 账户状态类型
export interface AccountState {
  balance: string;
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
}

// 认证状态类型
export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

// 转账表单类型
export interface TransferFormData {
  to: string;
  amount: string;
  data?: string;
} 