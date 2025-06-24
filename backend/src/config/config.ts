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
    entryPointAddress: string;
    accountFactoryAddress: string;
    paymasterAddress: string;
  };
  bundler: {
    url: string;
  };
  paymaster: {
    apiKey: string;
    url: string;
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aastar?directConnection=true',
  logLevel: process.env.LOG_LEVEL || 'info',
  ethereum: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://sepolia.infura.io/v3/',
    chainId: parseInt(process.env.CHAIN_ID || '11155111', 10), // Sepolia测试网
    entryPointAddress: process.env.ENTRY_POINT_ADDRESS || '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    accountFactoryAddress: process.env.ACCOUNT_FACTORY_ADDRESS || '0x9406Cc6185a346906296840746125a0E44976454',
    paymasterAddress: process.env.PAYMASTER_ADDRESS || '0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770',
  },
  bundler: {
    url: process.env.BUNDLER_URL || 'https://api.pimlico.io/v1/sepolia/rpc',
  },
  paymaster: {
    apiKey: process.env.PIMLICO_API_KEY || '',
    url: process.env.PIMLICO_URL || 'https://api.pimlico.io/v1/sepolia/rpc',
  },
};

export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/aastar?directConnection=true',
  logLevel: process.env.LOG_LEVEL || 'info',
  ethereum: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://sepolia.infura.io/v3/',
    chainId: parseInt(process.env.CHAIN_ID || '11155111', 10), // Sepolia测试网
    entryPointAddress: process.env.ENTRY_POINT_ADDRESS || '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789',
    accountFactoryAddress: process.env.ACCOUNT_FACTORY_ADDRESS || '0x9406Cc6185a346906296840746125a0E44976454',
    paymasterAddress: process.env.PAYMASTER_ADDRESS || '0xE93ECa6595fe94091DC1af46aaC2A8b5D7990770',
  },
  bundler: {
    url: process.env.BUNDLER_URL || 'https://api.pimlico.io/v1/sepolia/rpc',
  },
  paymaster: {
    apiKey: process.env.PIMLICO_API_KEY || '',
    url: process.env.PIMLICO_URL || 'https://api.pimlico.io/v1/sepolia/rpc',
  },
});