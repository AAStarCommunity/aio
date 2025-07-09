import dotenv from 'dotenv';

dotenv.config();

export default {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aastar?directConnection=true',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
  
  // Ethereum configuration
  ETH_PRIVATE_KEY: process.env.ETH_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  CHAIN_ID: process.env.CHAIN_ID || '31337',  // 默认使用本地anvil链
  RPC_URL: process.env.RPC_URL || 'http://localhost:8545',
  ENTRY_POINT_ADDRESS: process.env.ENTRY_POINT_ADDRESS || '0x5fbdb2315678afecb367f032d93f642f64180aa3',
  ACCOUNT_FACTORY_ADDRESS: process.env.ACCOUNT_FACTORY_ADDRESS || '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
  PAYMASTER_ADDRESS: process.env.PAYMASTER_ADDRESS || '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0',
  
  // Bundler configuration
  BUNDLER_URL: process.env.BUNDLER_URL || 'http://localhost:8545',
  PIMLICO_API_KEY: process.env.PIMLICO_API_KEY || '',
  PIMLICO_URL: process.env.PIMLICO_URL || '',
  
  // BLS configuration
  BLS_PRIVATE_KEY: process.env.BLS_PRIVATE_KEY || 'b37294901c310441cd3c22c0b8d17cd62c7b86e0a59e12e7da5f7eb12c2c325b',
  
  // Paymaster配置
  DEFAULT_PAYMASTER_TYPE: process.env.DEFAULT_PAYMASTER_TYPE || 'pimlico',
  GAS_BUFFER_PERCENTAGE: Number(process.env.GAS_BUFFER_PERCENTAGE) || 20, // Gas估算缓冲比例
  MAX_GAS_LIMIT: process.env.MAX_GAS_LIMIT || '1000000',  // 最大Gas限制
  
  // 自定义Paymaster配置（将来使用）
  CUSTOM_PAYMASTER_ADDRESS: process.env.CUSTOM_PAYMASTER_ADDRESS || '',
  CUSTOM_PAYMASTER_PRIVATE_KEY: process.env.CUSTOM_PAYMASTER_PRIVATE_KEY || '',
}; 