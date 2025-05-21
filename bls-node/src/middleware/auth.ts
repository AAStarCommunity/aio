import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import logger from '../utils/logger';

// 扩展Request类型以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        nodeId?: string;
      };
    }
  }
}

/**
 * 验证JWT令牌
 */
export const verifyToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      req.user = decoded as { userId: string; nodeId?: string };
      next();
    } catch (error) {
      logger.error(`令牌验证失败: ${error instanceof Error ? error.message : String(error)}`);
      return res.status(401).json({ error: '无效的认证令牌' });
    }
  } catch (error) {
    logger.error(`认证中间件错误: ${error instanceof Error ? error.message : String(error)}`);
    return res.status(500).json({ error: '认证处理失败' });
  }
};

/**
 * 验证是否为主节点
 */
export const verifyMasterNode = (req: Request, res: Response, next: NextFunction) => {
  if (!config.isMasterNode) {
    return res.status(403).json({ error: '只有主节点可以执行此操作' });
  }
  next();
};

/**
 * 生成JWT令牌
 */
export const generateToken = (payload: { userId: string; nodeId?: string }): string => {
  return jwt.sign(payload, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}; 