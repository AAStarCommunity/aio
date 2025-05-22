import dotenv from 'dotenv';
import path from 'path';

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
    pimlico: {
      apiKey: string;
      url: string;
    };
    stackup: {
      apiKey: string;
      url: string;
    };
    activeProvider: 'pimlico' | 'stackup';
  };
}

const config: Config = {
  port: parseInt(process.env.PORT || '3000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://localhost:27017/aastar',
  logLevel: process.env.LOG_LEVEL || 'info',
  ethereum: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://sepolia.infura.io/v3/your-api-key',
    chainId: parseInt(process.env.CHAIN_ID || '11155111', 10), // Sepolia测试网
    entryPointAddress: process.env.ENTRY_POINT_ADDRESS || '0x0000000000000000000000000000000000000000',
    accountFactoryAddress: process.env.ACCOUNT_FACTORY_ADDRESS || '0x0000000000000000000000000000000000000000',
    paymasterAddress: process.env.PAYMASTER_ADDRESS || '0x0000000000000000000000000000000000000000',
  },
  bundler: {
    pimlico: {
      apiKey: process.env.PIMLICO_API_KEY || '',
      url: process.env.PIMLICO_URL || 'https://api.pimlico.io/v1/sepolia/rpc',
    },
    stackup: {
      apiKey: process.env.STACKUP_API_KEY || '',
      url: process.env.STACKUP_URL || 'https://api.stackup.sh/v1/node/sepolia',
    },
    activeProvider: (process.env.ACTIVE_BUNDLER as 'pimlico' | 'stackup') || 'pimlico',
  },
};

export default config; 