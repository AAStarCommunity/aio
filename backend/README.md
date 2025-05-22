# AAStar后端服务

AAStar项目的后端服务，实现了用户注册、交易处理和Bundler服务接入功能。

## Bundler服务接入

AAStar项目使用第三方Bundler服务(Pimlico或Stackup)来处理用户操作(UserOperation)。后端服务负责与Bundler服务通信，提交用户操作并获取交易结果。

### 支持的Bundler服务

- **Pimlico**: 一个专业的ERC-4337 Bundler服务提供商，支持多种网络。
- **Stackup**: 另一个流行的Bundler服务提供商，同样支持多种网络。

### 配置

在`.env`文件中配置Bundler服务相关参数：

```
# Bundler配置
ACTIVE_BUNDLER=pimlico # 可选值: pimlico, stackup

# Pimlico Bundler配置
PIMLICO_API_KEY=your-pimlico-api-key
PIMLICO_URL=https://api.pimlico.io/v1/sepolia/rpc

# Stackup Bundler配置
STACKUP_API_KEY=your-stackup-api-key
STACKUP_URL=https://api.stackup.sh/v1/node/sepolia
```

### 使用流程

1. **创建用户操作**: 通过调用`UserOperationService.createUserOperation`方法，创建未签名的用户操作。
2. **签名用户操作**: 前端负责使用用户的Passkey对用户操作进行签名。
3. **提交用户操作**: 将签名后的用户操作通过`UserOperationService.sendUserOperation`方法提交给Bundler服务。
4. **获取交易状态**: 使用`UserOperationService.getUserOperationStatus`方法查询交易执行状态。

### API接口

后端服务提供以下API接口：

- **POST /api/userop/create**: 创建用户操作
- **POST /api/userop/send**: 发送用户操作
- **GET /api/userop/status/:userOpHash**: 获取用户操作状态
- **POST /api/userop/estimate-gas**: 估算交易gas费用

## 安装与运行

### 前置条件

- Node.js (v16+)
- npm 或 yarn
- MongoDB (可选，用于用户数据存储)

### 安装

```bash
# 安装依赖
npm install

# 创建.env文件
cp .env.example .env
# 编辑.env文件，填入必要的配置参数
```

### 运行

```bash
# 开发模式
npm run dev

# 生产模式
npm run build
npm start
```

## 开发指南

### 添加新的Bundler服务提供商

1. 在`src/services/BundlerService.ts`文件中创建新的服务类，实现`IBundlerService`接口。
2. 在`BundlerServiceFactory`类中添加新的服务提供商。

### 自定义用户操作处理逻辑

如需自定义用户操作处理逻辑，可以修改`src/services/UserOperationService.ts`文件中的相关方法。

## 测试

```bash
# 运行测试
npm test
```

## 部署

### Docker部署

1. 构建Docker镜像:
```bash
docker build -t aastar-backend .
```

2. 运行Docker容器:
```bash
docker run -p 3000:3000 --env-file .env aastar-backend
```

### 传统部署

1. 构建项目:
```bash
npm run build
```

2. 使用PM2运行:
```bash
pm2 start dist/index.js --name aastar-backend
``` 