# AirAccount - 基于账户抽象的区块链钱包

AirAccount 是一个基于 ERC-4337 账户抽象标准的区块链钱包应用，集成了 BLS 签名和 WebAuthn 认证，提供安全且用户友好的区块链交互体验。

## 🌟 特性

- **账户抽象**：基于 ERC-4337 标准实现，支持批量交易和灵活的认证机制
- **BLS 签名**：使用 BLS（Boneh-Lynn-Shacham）签名算法，支持签名聚合
- **无密码认证**：集成 WebAuthn，提供安全的生物识别和硬件密钥认证
- **模块化架构**：前后端分离，独立的 BLS 节点服务

## 🏗️ 项目结构

```
├── backend          # NestJS 后端服务
├── bls-node         # BLS 签名节点服务
├── contracts        # Solidity 智能合约
└── frontend         # Next.js 前端应用
```

## 🔧 核心组件

### 智能合约

- `AAAccount.sol`: 账户抽象合约实现
- `BLSNodeRegistry.sol`: BLS 节点注册管理
- `AAPaymaster.sol`: 支付管理合约

### 后端服务

- BLS 签名验证
- 用户操作处理
- WebAuthn 认证集成

### BLS 节点

- 签名验证服务
- 节点注册管理
- 性能优化实现

### 前端应用

- 现代化 React 组件
- TailwindCSS 样式框架
- Zustand 状态管理

## 🚀 快速开始

### 环境要求

- Node.js >= 16
- MongoDB
- Foundry (智能合约开发)

### 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装各个模块依赖
cd backend && npm install
cd ../bls-node && npm install
cd ../frontend && npm install
cd ../contracts && forge install
```

### 启动服务

1. 启动后端服务
```bash
cd backend
npm run start:dev
```

2. 启动 BLS 节点
```bash
cd bls-node
npm run start:dev
```

3. 启动前端应用
```bash
cd frontend
npm run dev
```

## 🧪 测试

每个模块都包含完整的测试套件：

```bash
# 后端测试
cd backend && npm test

# BLS 节点测试
cd bls-node && npm test

# 前端测试
cd frontend && npm test

# 智能合约测试
cd contracts && forge test
```

## 📚 文档

详细文档请参考各模块目录下的 README 文件：

- [后端文档](./backend/README.md)
- [BLS 节点文档](./bls-node/README.md)
- [智能合约文档](./contracts/README.md)

## 🔐 安全性

- 使用 BLS 签名确保交易安全
- WebAuthn 提供强大的身份认证
- 支持测试模式便于开发和调试

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来帮助改进项目。

## 📄 许可证

MIT License