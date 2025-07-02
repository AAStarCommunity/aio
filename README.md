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

## 🆕 联系人管理增强功能

现在支持两种方式添加联系人：

#### 1. 通过钱包地址添加联系人
- 支持输入有效的以太坊钱包地址 (0x...)
- 自动验证地址格式
- 支持直接转账

#### 2. 通过邮箱地址添加联系人 ✨ **新功能**
- 支持输入已注册用户的邮箱地址
- 自动验证邮箱格式和注册状态
- 防止重复添加
- 暂不支持直接转账（显示相应提示）

## 快速开始

### 前端 (frontdoor)
```bash
cd frontdoor
npm install
npm run dev
```
访问: http://localhost:8080

### 后端 (backend)
```bash
cd backend
npm install
npm run start:dev
```
API服务: http://localhost:3000

## API 接口

### 新增邮箱验证接口

**检查邮箱是否已注册**
```
GET /api/auth/email/check/:email
```

响应:
```json
{
  "exists": true
}
```

## 使用说明

### 添加联系人

1. **选择添加方式**
   - 点击"钱包地址"按钮通过地址添加
   - 点击"邮箱地址"按钮通过邮箱添加

2. **填写信息**
   - 输入联系人备注名（必填）
   - 根据选择的方式输入钱包地址或邮箱地址

3. **自动验证**
   - 钱包地址：验证格式是否正确
   - 邮箱地址：验证格式并检查是否已注册
   - 检查是否重复添加

4. **完成添加**
   - 验证通过后联系人将添加到列表
   - 钱包联系人支持转账功能
   - 邮箱联系人暂不支持转账

### 联系人列表

- 🔵 钱包图标：通过钱包地址添加的联系人
- 🟢 邮箱图标：通过邮箱地址添加的联系人
- ⚠️ 邮箱联系人显示"暂不支持直接转账"提示

## 技术实现

### 前端技术栈
- Next.js 14
- TypeScript
- Tailwind CSS
- Lucide React Icons

### 后端技术栈
- NestJS
- MongoDB
- TypeScript
- SimpleWebAuthn

### 主要更新

1. **类型定义更新** (`frontdoor/lib/types.ts`)
   - Contact 接口支持可选的 `email` 和 `walletAddress` 字段
   - 新增 `contactType` 字段区分联系人类型

2. **存储逻辑增强** (`frontdoor/lib/storage.ts`)
   - 新增 `getContactByEmail()` 方法
   - 新增 `isContactExists()` 方法防止重复添加

3. **UI 组件优化**
   - AddContactModal：支持选择添加方式
   - ContactList：显示不同类型联系人的图标和状态

4. **后端 API 扩展**
   - 新增邮箱验证接口
   - UserService 添加 `checkEmailExists()` 方法

## 注意事项

- 邮箱联系人功能需要后端服务运行
- 如果后端服务不可用，会自动降级使用模拟数据
- 邮箱联系人暂不支持转账功能，后续版本将会支持

## 开发调试

测试邮箱（默认已注册）：
- demo@example.com
- alice@example.com
- bob@example.com
- charlie@example.com
- test@example.com