# Backend Scripts

这个目录包含了用于测试和验证 AirAccount 项目后端功能的脚本。

## 脚本列表

### `test-entrypoint-compliance.js`

**用途**: 验证部署的 EntryPoint 合约是否符合 ERC-4337 标准

**功能**:
- 连接到本地 anvil 网络
- 测试 EntryPoint 合约的基本功能
- 验证存款、余额查询、用户操作哈希生成等功能
- 确保合约符合 ERC-4337 标准

**使用方法**:
```bash
cd backend
node scripts/test-entrypoint-compliance.js
```

**前提条件**:
- anvil 网络正在运行 (localhost:8545)
- EntryPoint 合约已部署
- 已安装 ethers.js 依赖 (`npm install ethers`)

**环境变量**:
- `ENTRY_POINT_ADDRESS`: EntryPoint 合约地址（可选，默认使用脚本中硬编码的地址）

## 开发注意事项

- 这些脚本主要用于开发和测试阶段
- 在生产环境中使用前，请确保更新相关的配置和地址
- 所有脚本都应该从 `backend` 目录运行 