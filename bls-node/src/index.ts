import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import config from './config/config';
import logger from './utils/logger';
import blsRoutes from './routes/blsRoutes';
import { connectDatabase } from './config/database';

// 创建Express应用
const app = express();

// 确保logs目录存在
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 配置中间件
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// 配置路由
app.use('/api/bls', blsRoutes);

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString()
  });
});

// 配置错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

// 启动服务器
const startServer = async () => {
  try {
    // 连接数据库
    await connectDatabase();
    logger.info('Successfully connected to MongoDB');

    app.listen(config.port, () => {
      logger.info(`BLS node server is running on port ${config.port}`);
      logger.info(`Environment: ${config.nodeEnv}`);
      logger.info(`Node ID: ${config.nodeId}`);
      logger.info(`Log level: ${config.logLevel}`);
      logger.info(`Master node: ${config.isMasterNode}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;