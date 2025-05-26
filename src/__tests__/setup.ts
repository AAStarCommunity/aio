// 增加测试超时时间
jest.setTimeout(30000);

// 禁用控制台输出
console.log = jest.fn();
console.error = jest.fn();
console.warn = jest.fn(); 