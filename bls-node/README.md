# AAStar BLS 节点

AAStar 项目的 BLS 节点服务，负责 BLS 签名和验签功能。

## 功能特点

- 无权限（Permissionless）设计：任何服务都可以调用 BLS 节点进行签名和验签
- BLS 签名：支持对消息进行 BLS 签名
- 签名验证：支持验证 BLS 签名的有效性
- 签名聚合：支持聚合多个 BLS 签名
- 节点注册：通过智能合约注册 BLS 节点

## API 接口

### 1. 签名接口

```http
POST /api/bls/sign
Content-Type: application/json

{
  "message": "要签名的消息"
}
```

响应：
```json
{
  "signature": "BLS签名"
}
```

### 2. 验签接口

```http
POST /api/bls/verify
Content-Type: application/json

{
  "message": "原始消息",
  "signature": "BLS签名",
  "publicKey": "公钥"
}
```

响应：
```json
{
  "isValid": true/false
}
```

### 3. 签名聚合接口

```http
POST /api/bls/aggregate
Content-Type: application/json

{
  "signatures": ["签名1", "签名2", ...]
}
```

响应：
```json
{
  "aggregatedSignature": "聚合后的签名"
}
```

### 4. 获取公钥接口

```http
GET /api/bls/public-key
```

响应：
```json
{
  "publicKey": "BLS公钥"
}
```

## 安装与运行

### 前置条件

- Node.js (v16+)
- npm 或 yarn

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

## 配置说明

在 `.env` 文件中配置以下参数：

- `PORT`: 服务器端口号
- `NODE_ENV`: 运行环境（development/production）
- `LOG_LEVEL`: 日志级别
- `ETH_RPC_URL`: 以太坊 RPC 节点地址
- `CHAIN_ID`: 以太坊链 ID
- `BLS_NODE_REGISTRY_ADDRESS`: BLS 节点注册合约地址
- `BLS_PRIVATE_KEY`: BLS 私钥
- `BLS_PUBLIC_KEY`: BLS 公钥

## 开发指南

### 添加新的 BLS 功能

1. 在 `src/services/BLSService.ts` 中添加新的方法
2. 在 `src/controllers/BLSController.ts` 中添加对应的控制器方法
3. 在 `src/routes/blsRoutes.ts` 中添加新的路由

### 测试

```bash
# 运行测试
npm test
```

## 部署

### Docker 部署

1. 构建 Docker 镜像:
```bash
docker build -t aastar-bls-node .
```

2. 运行 Docker 容器:
```bash
docker run -p 3001:3001 --env-file .env aastar-bls-node
```

### 传统部署

1. 构建项目:
```bash
npm run build
```

2. 使用 PM2 运行:
```bash
pm2 start dist/index.js --name aastar-bls-node
``` 