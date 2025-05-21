import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { verifyToken, verifyMasterNode, generateToken } from '../middleware/auth';
import config from '../config';

describe('认证中间件', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();

  beforeEach(() => {
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
  });

  describe('JWT令牌验证', () => {
    const validPayload = {
      userId: 'test-user',
      nodeId: 'test-node'
    };

    test('有效令牌应该通过验证', () => {
      const token = jwt.sign(validPayload, config.jwtSecret);
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      verifyToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
      expect(mockRequest.user).toEqual(validPayload);
    });

    test('没有令牌应该返回401错误', () => {
      verifyToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: '未提供认证令牌'
      });
    });

    test('无效令牌应该返回401错误', () => {
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      verifyToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: '无效的认证令牌'
      });
    });

    test('过期令牌应该返回401错误', () => {
      const token = jwt.sign(validPayload, config.jwtSecret, { expiresIn: '0s' });
      mockRequest.headers = {
        authorization: `Bearer ${token}`
      };

      verifyToken(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: '无效的认证令牌'
      });
    });
  });

  describe('主节点验证', () => {
    test('主节点应该通过验证', () => {
      // 设置为主节点
      Object.defineProperty(config, 'isMasterNode', {
        get: () => true
      });

      verifyMasterNode(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(nextFunction).toHaveBeenCalled();
    });

    test('非主节点应该返回403错误', () => {
      // 设置为非主节点
      Object.defineProperty(config, 'isMasterNode', {
        get: () => false
      });

      verifyMasterNode(mockRequest as Request, mockResponse as Response, nextFunction);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: '只有主节点可以执行此操作'
      });
    });
  });

  describe('令牌生成', () => {
    test('应该能够生成有效的JWT令牌', () => {
      const payload = {
        userId: 'test-user',
        nodeId: 'test-node'
      };

      const token = generateToken(payload);
      expect(token).toBeDefined();

      // 验证令牌
      const decoded = jwt.verify(token, config.jwtSecret) as typeof payload;
      expect(decoded.userId).toBe(payload.userId);
      expect(decoded.nodeId).toBe(payload.nodeId);
    });

    test('生成的令牌应该包含过期时间', () => {
      const payload = { userId: 'test-user' };
      const token = generateToken(payload);
      const decoded = jwt.decode(token) as { exp: number };

      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Date.now() / 1000);
    });
  });
}); 