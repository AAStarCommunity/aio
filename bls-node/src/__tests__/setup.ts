import dotenv from 'dotenv';
import path from 'path';

// 加载测试环境变量
dotenv.config({ path: path.resolve(__dirname, '../../.env.test') });

// 设置测试超时时间
jest.setTimeout(10000);

// 全局测试设置
beforeAll(() => {
  // 设置测试环境变量
  process.env.NODE_ENV = 'test';
  process.env.PORT = '3001';
  process.env.LOG_LEVEL = 'error';
});

// 清理测试环境
afterAll(() => {
  // 清理测试环境变量
  process.env.NODE_ENV = '';
  process.env.PORT = '';
  process.env.LOG_LEVEL = '';
}); 