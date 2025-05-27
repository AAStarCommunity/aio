import { config } from 'dotenv';
import mongoose from 'mongoose';

// 加载环境变量
config();

// 设置测试超时时间
jest.setTimeout(30000);

// 全局清理函数
afterAll(async () => {
  // 关闭所有数据库连接
  await mongoose.disconnect();
}); 