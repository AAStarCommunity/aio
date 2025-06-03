import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

interface Config {
  port: number;
  nodeEnv: string;
  nodeId: string;
  logLevel: string;
  node: {
    url: string;
  };
  ethereum: {
    rpcUrl: string;
    chainId: number;
    blsNodeRegistryAddress: string;
    privateKey: string;
  };
  bls: {
    privateKey: string;
    publicKey: string;
  };
  isMasterNode: boolean;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  nodeId: process.env.NODE_ID || 'node1',
  logLevel: process.env.LOG_LEVEL || 'info',
  node: {
    url: process.env.NODE_URL || `http://localhost:${process.env.PORT || '3001'}`,
  },
  ethereum: {
    rpcUrl: process.env.ETH_RPC_URL || 'https://sepolia.infura.io/v3/your-api-key',
    chainId: parseInt(process.env.CHAIN_ID || '11155111', 10), // Sepolia测试网
    blsNodeRegistryAddress: process.env.BLS_NODE_REGISTRY_ADDRESS || '0x0000000000000000000000000000000000000000',
    privateKey: process.env.ETH_PRIVATE_KEY || '',
  },
  bls: {
    privateKey: process.env.BLS_PRIVATE_KEY || '',
    publicKey: process.env.BLS_PUBLIC_KEY || '',
  },
  isMasterNode: process.env.IS_MASTER_NODE === 'true'
};

export default config; 