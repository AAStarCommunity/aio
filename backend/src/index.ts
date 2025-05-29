import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import configuration from './config/configuration';
import logger from './utils/logger';
import userOperationRoutes from './routes/userOperationRoutes';

// 创建Express应用
const app = express();

// 确保logs目录存在
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// 配置中间件
app.use(cors());
app.use(express.json());
app.use(morgan('combined'));

// 配置路由
app.use('/api/userop', userOperationRoutes);

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 配置错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error(`Unhandled error: ${err.message}`);
  res.status(500).json({ error: 'Internal server error' });
});

// 启动服务器
const PORT = configuration.port;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${configuration.nodeEnv}`);
  logger.info(`EntryPoint address: ${configuration.ethereum.entryPointAddress}`);
  logger.info(`AccountFactory address: ${configuration.ethereum.accountFactoryAddress}`);
  logger.info(`Paymaster address: ${configuration.ethereum.paymasterAddress}`);
  logger.info(`Bundler URL: ${configuration.bundler.url}`);
});

export default app; 