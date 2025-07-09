import * as dotenv from 'dotenv';
import * as path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  port: number;
  nodeEnv: string;
  mongoUri: string;
  logLevel: string;
  ethereum: {
    rpcUrl: string;
    chainId: number;
    privateKey: string;
    entryPointAddress: string;
    accountFactoryAddress: string;
    paymasterAddress: string;
  };
  bundler: {
    url: string;
    apiKey: string;
  };
  paymaster: {
    apiKey: string;
    url: string;
  };
  bls: {
    privateKey: string;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aastar?directConnection=true',
  logLevel: process.env.LOG_LEVEL || 'info',
  ethereum: {
    rpcUrl: process.env.ETH_RPC_URL || 'http://localhost:8545',
    chainId: parseInt(process.env.CHAIN_ID || '31337', 10), // 本地anvil链
    privateKey: process.env.ETH_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    entryPointAddress: process.env.ENTRY_POINT_ADDRESS || '0x5fbdb2315678afecb367f032d93f642f64180aa3',
    accountFactoryAddress: process.env.ACCOUNT_FACTORY_ADDRESS || '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
    paymasterAddress: process.env.PAYMASTER_ADDRESS || '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0',
  },
  bundler: {
    url: process.env.BUNDLER_URL || 'http://localhost:8545',
    apiKey: process.env.PIMLICO_API_KEY || '',
  },
  paymaster: {
    apiKey: process.env.PIMLICO_API_KEY || '',
    url: process.env.PIMLICO_URL || 'http://localhost:8545',
  },
  bls: {
    privateKey: process.env.BLS_PRIVATE_KEY || 'b37294901c310441cd3c22c0b8d17cd62c7b86e0a59e12e7da5f7eb12c2c325b',
  },
};

export default config;

// 导出默认配置，供测试使用
export const defaultConfig: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aastar?directConnection=true',
  logLevel: process.env.LOG_LEVEL || 'info',
  ethereum: {
    rpcUrl: process.env.ETH_RPC_URL || 'http://localhost:8545',
    chainId: parseInt(process.env.CHAIN_ID || '31337', 10), // 本地anvil链
    privateKey: process.env.ETH_PRIVATE_KEY || '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
    entryPointAddress: process.env.ENTRY_POINT_ADDRESS || '0x5fbdb2315678afecb367f032d93f642f64180aa3',
    accountFactoryAddress: process.env.ACCOUNT_FACTORY_ADDRESS || '0xe7f1725e7734ce288f8367e1bb143e90bb3f0512',
    paymasterAddress: process.env.PAYMASTER_ADDRESS || '0x9fe46736679d2d9a65f0992f2272de9f3c7fa6e0',
  },
  bundler: {
    url: process.env.BUNDLER_URL || 'http://localhost:8545',
    apiKey: process.env.PIMLICO_API_KEY || '',
  },
  paymaster: {
    apiKey: process.env.PIMLICO_API_KEY || '',
    url: process.env.PIMLICO_URL || 'http://localhost:8545',
  },
  bls: {
    privateKey: process.env.BLS_PRIVATE_KEY || 'b37294901c310441cd3c22c0b8d17cd62c7b86e0a59e12e7da5f7eb12c2c325b',
  },
};