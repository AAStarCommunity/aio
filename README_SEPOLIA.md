# AirAccount Sepolia测试网部署指南

## 1. 环境准备

### 1.1 获取测试网资源
- **Infura/Alchemy API Key**: 用于连接Sepolia测试网
- **Etherscan API Key**: 用于合约验证
- **测试网ETH**: 从Sepolia水龙头获取测试ETH

### 1.2 配置环境变量

#### 合约部署配置 (`contracts/.env`)
```bash
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY
PRIVATE_KEY=YOUR_PRIVATE_KEY
```

#### 后端配置 (`backend/.env`)
```bash
# 区块链配置
RPC_URL=https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
CHAIN_ID=11155111
PRIVATE_KEY=YOUR_PRIVATE_KEY

# Bundler配置
BUNDLER_URL=https://sepolia.stackup.sh

# 合约地址（部署后更新）
ENTRY_POINT_ADDRESS=0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789
ACCOUNT_FACTORY_ADDRESS=<部署后更新>
PAYMASTER_ADDRESS=<部署后更新>
```

#### Bundler配置 (`stackup-bundler/config.sepolia.yml`)
```yaml
eth_client_url: "https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID"
private_key: "YOUR_PRIVATE_KEY"
```

## 2. 合约部署

### 2.1 编译合约
```bash
cd contracts
forge build
```

### 2.2 部署到Sepolia
```bash
forge script script/DeploySepolia.s.sol:DeploySepolia --rpc-url $RPC_URL --private-key $PRIVATE_KEY --broadcast --verify
```

### 2.3 更新部署记录
部署完成后，更新 `deployments/sepolia.json` 文件中的合约地址。

## 3. 服务启动

### 3.1 启动后端服务
```bash
cd backend
npm install
npm run start:dev
```

### 3.2 启动前端服务
```bash
cd frontdoor
npm install
npm run dev
```

## 4. 测试

### 4.1 验证合约部署
```bash
# 检查EntryPoint合约
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getCode","params":["0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789","latest"],"id":1}' \
  https://sepolia.infura.io/v3/YOUR_INFURA_PROJECT_ID
```

### 4.2 测试Bundler
```bash
# 检查支持的EntryPoint
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_supportedEntryPoints","params":[],"id":1}' \
  https://sepolia.stackup.sh
```

## 5. 注意事项

1. **测试网ETH**: 确保部署账户有足够的Sepolia测试ETH
2. **网络延迟**: Sepolia测试网可能有网络延迟，部署需要耐心等待
3. **Gas费用**: 测试网的Gas费用可能波动，建议设置合理的Gas限制
4. **合约验证**: 部署后记得在Etherscan上验证合约代码

## 6. 故障排除

### 常见问题
1. **RPC连接失败**: 检查Infura/Alchemy API Key是否正确
2. **Gas不足**: 从Sepolia水龙头获取更多测试ETH
3. **合约验证失败**: 确保Etherscan API Key有效

### 获取测试ETH
- Sepolia水龙头: https://sepoliafaucet.com/
- Alchemy水龙头: https://sepoliafaucet.com/ 