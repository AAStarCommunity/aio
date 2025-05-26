import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.join(__dirname, '../../.env') });

export interface Config {
  server: {
    port: number;
    nodeEnv: string;
  };
  mongodb: {
    uri: string;
  };
  ethereum: {
    rpcUrl: string;
    chainId: number;
  };
  blsNode: {
    url: string;
  };
  bundler: {
    url: string;
  };
  paymaster: {
    url: string;
    contractAddress: string;
  };
  security: {
    sessionSecret: string;
    corsOrigin: string;
  };
}

const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/aastar',
  },
  ethereum: {
    rpcUrl: process.env.ETHEREUM_RPC_URL || '',
    chainId: parseInt(process.env.CHAIN_ID || '11155111', 10),
  },
  blsNode: {
    url: process.env.BLS_NODE_URL || 'http://localhost:3001',
  },
  bundler: {
    url: process.env.BUNDLER_URL || 'http://localhost:4337',
  },
  paymaster: {
    url: process.env.PAYMASTER_URL || 'http://localhost:4338',
    contractAddress: process.env.PAYMASTER_CONTRACT_ADDRESS || '',
  },
  security: {
    sessionSecret: process.env.SESSION_SECRET || 'default-secret',
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  },
};

export default config; 