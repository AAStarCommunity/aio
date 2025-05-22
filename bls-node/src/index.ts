import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import morgan from 'morgan';
import config from './config';
import logger from './utils/logger';
import nodeService from './services/nodeService';
import apiRoutes from './routes';
import { connectDatabase } from './config/database';
import { verifyToken } from './middleware/auth';
import fs from 'fs';
import path from 'path';
import blsRoutes from './routes/blsRoutes';

async function startServer() {
  try {
    // 连接数据库
    await connectDatabase();

    // 初始化节点服务
    await nodeService.initialize();

    // 创建Express应用
    const app = express();

    // 确保logs目录存在
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // 中间件
    app.use(cors());
    app.use(bodyParser.json());
    app.use(morgan('dev', { stream: { write: message => logger.info(message.trim()) } }));

    // 健康检查路由
    app.get('/health', (req, res) => {
      res.status(200).json({ status: 'ok', nodeId: config.nodeId });
    });

    // API路由（添加认证中间件）
    app.use('/api', verifyToken, apiRoutes);

    // 配置路由
    app.use('/api/bls', blsRoutes);

    // 错误处理中间件
    app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      logger.error(`错误: ${err.message}`);
      res.status(err.status || 500).json({
        error: {
          message: err.message || '服务器内部错误'
        }
      });
    });

    // 启动服务器
    app.listen(config.port, () => {
      logger.info(`BLS节点服务已启动，监听端口: ${config.port}`);
      logger.info(`节点ID: ${config.nodeId}`);
      logger.info(`环境: ${config.nodeEnv}`);
      logger.info(`BLS Node Registry address: ${config.ethereum.blsNodeRegistryAddress}`);
      logger.info(`BLS Public Key: ${config.bls.publicKey}`);
    });

    return app;
  } catch (error) {
    logger.error(`启动服务器失败: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

// 启动服务器
startServer(); 