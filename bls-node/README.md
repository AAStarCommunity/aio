# BLS节点服务

BLS节点是AAStar项目的重要组成部分，负责Passkey签名验证和BLS签名生成。通过BLS聚合签名技术，实现多方验证，提高系统安全性。

## 功能特点

- Passkey签名验证：验证用户提交的Passkey签名
- BLS签名生成：使用BLS私钥对用户操作进行签名
- 多节点协作：支持多个BLS节点协作，实现签名聚合
- 主从架构：支持主节点和从节点模式

## 技术栈

- Node.js & TypeScript
- Express.js
- @noble/bls12-381：BLS签名算法库
- @simplewebauthn：Passkey (WebAuthn) 验证库
- Winston：日志记录

## 快速开始

### 前置条件

- Node.js 16+ 
- npm 8+

### 安装依赖

```bash
npm install
```

### 配置环境变量

复制环境变量模板文件并进行配置：

```bash
cp example.env .env
```

配置项说明：

- `PORT`：服务监听端口
- `NODE_ENV`：运行环境
- `NODE_ID`：节点唯一标识
- `MASTER_NODE_URL`：主节点URL
- `IS_MASTER_NODE`：是否为主节点
- `BLS_PRIVATE_KEY`：BLS私钥
- `RP_ID`：Passkey Relying Party ID
- `RP_NAME`：Passkey Relying Party 名称
- `ORIGIN`：允许的源站
- `LOG_LEVEL`：日志级别

### 构建与运行

构建项目：

```bash
npm run build
```

启动服务：

```bash
npm start
```

开发模式启动（支持热重载）：

```bash
npm run dev
```

### 运行测试

```bash
npm test
```

## API接口

### Passkey相关

- `POST /api/passkey/generate-registration-options`: 生成Passkey注册选项
- `POST /api/passkey/verify-registration`: 验证Passkey注册
- `POST /api/passkey/generate-authentication-options`: 生成Passkey认证选项
- `POST /api/passkey/verify-authentication`: 验证Passkey认证
- `POST /api/passkey/verify-userop`: 验证UserOperation签名

### 签名相关

- `POST /api/sign`: 使用BLS私钥对消息进行签名
- `POST /api/sign/aggregate`: 聚合来自多个节点的签名
- `POST /api/sign/verify`: 验证BLS聚合签名

### 节点管理

- `GET /api/nodes`: 获取所有节点列表
- `POST /api/nodes/register`: 注册新节点
- `DELETE /api/nodes/:nodeId`: 移除节点

## 部署

### Docker部署

构建Docker镜像：

```bash
docker build -t bls-node .
```

运行Docker容器：

```bash
docker run -p 3001:3001 --env-file .env bls-node
```

### 多节点部署

部署多个BLS节点时，需要：

1. 为每个节点指定唯一的`NODE_ID`
2. 设置一个节点为主节点(`IS_MASTER_NODE=true`)
3. 其他节点配置指向主节点的URL (`MASTER_NODE_URL`)

## 贡献指南

欢迎提交问题或Pull Request！

## 许可证

ISC 