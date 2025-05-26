import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import session from 'express-session';
import { connectDB } from './utils/db';
import config from './config';
import logger from './utils/logger';
import { errorHandler } from './middlewares/error.middleware';
import userRoutes from './routes/user.routes';

const app = express();

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors({
  origin: config.security.corsOrigin,
  credentials: true,
}));
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim()),
  },
}));

// Session中间件
app.use(session({
  secret: config.security.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: config.server.nodeEnv === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24小时
  },
}));

// 路由
app.use('/api/v1/users', userRoutes);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// 错误处理
app.use(errorHandler);

// 启动服务器
const start = async () => {
  try {
    // 连接数据库
    await connectDB();

    // 启动服务器
    app.listen(config.server.port, () => {
      logger.info(`Server is running on port ${config.server.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

start(); 