import mongoose from 'mongoose';
import config from './index';
import logger from '../utils/logger';

// 数据库连接URL
const MONGODB_URL = config.mongodbUrl || 'mongodb://localhost:27017/bls-node';

// 连接选项
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
} as mongoose.ConnectOptions;

// 连接数据库
export async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URL, options);
    logger.info('数据库连接成功');

    // 监听数据库连接事件
    mongoose.connection.on('error', (error) => {
      logger.error(`数据库连接错误: ${error}`);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('数据库连接断开');
    });

    // 优雅关闭数据库连接
    process.on('SIGINT', async () => {
      try {
        await mongoose.connection.close();
        logger.info('数据库连接已关闭');
        process.exit(0);
      } catch (error) {
        logger.error(`关闭数据库连接时出错: ${error}`);
        process.exit(1);
      }
    });
  } catch (error) {
    logger.error(`连接数据库失败: ${error}`);
    throw error;
  }
} 