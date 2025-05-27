import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // ... existing code ...
  
  // Paymaster配置
  PIMLICO_API_KEY: process.env.PIMLICO_API_KEY || '',
  CHAIN_ID: process.env.CHAIN_ID || 'sepolia',  // 默认使用Sepolia测试网
  RPC_URL: process.env.RPC_URL || 'https://sepolia.infura.io/v3/your-api-key',
  ENTRY_POINT_ADDRESS: process.env.ENTRY_POINT_ADDRESS || '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
  
  // Paymaster服务配置
  DEFAULT_PAYMASTER_TYPE: process.env.DEFAULT_PAYMASTER_TYPE || 'pimlico',
  GAS_BUFFER_PERCENTAGE: Number(process.env.GAS_BUFFER_PERCENTAGE) || 20, // Gas估算缓冲比例
  MAX_GAS_LIMIT: process.env.MAX_GAS_LIMIT || '1000000',  // 最大Gas限制
  
  // 自定义Paymaster配置（将来使用）
  CUSTOM_PAYMASTER_ADDRESS: process.env.CUSTOM_PAYMASTER_ADDRESS || '',
  CUSTOM_PAYMASTER_PRIVATE_KEY: process.env.CUSTOM_PAYMASTER_PRIVATE_KEY || '',
}; 