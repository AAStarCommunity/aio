import dotenv from 'dotenv';
import path from 'path';

// 加载环境变量
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

interface Config {
  port: number;
  nodeEnv: string;
  nodeId: string;
  masterNodeUrl: string;
  isMasterNode: boolean;
  blsPrivateKey: string;
  rpId: string;
  rpName: string;
  origin: string;
  logLevel: string;
  mongodbUrl: string;
  jwtSecret: string;
  jwtExpiresIn: string;
}

const config: Config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  nodeId: process.env.NODE_ID || 'node1',
  masterNodeUrl: process.env.MASTER_NODE_URL || 'http://localhost:3000',
  isMasterNode: process.env.IS_MASTER_NODE === 'true',
  blsPrivateKey: process.env.BLS_PRIVATE_KEY || '',
  rpId: process.env.RP_ID || 'localhost',
  rpName: process.env.RP_NAME || 'AAStar',
  origin: process.env.ORIGIN || 'http://localhost:3000',
  logLevel: process.env.LOG_LEVEL || 'info',
  mongodbUrl: process.env.MONGODB_URL || 'mongodb://localhost:27017/bls-node',
  jwtSecret: process.env.JWT_SECRET || 'your-jwt-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h'
};

export default config; 