// Jest测试全局设置
import { config } from 'dotenv';

// 加载环境变量
config();

// 设置测试超时时间
jest.setTimeout(30000);

// 全局清理函数
afterAll(async () => {
  // 在这里添加测试完成后的清理工作
  // 例如：关闭数据库连接等
}); 