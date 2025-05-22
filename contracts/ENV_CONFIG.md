# 环境配置说明

请在 `contracts` 目录下手动创建 `.env` 文件，并添加以下配置：

```bash
# 部署私钥（anvil 提供的第一个测试账户私钥）
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# RPC节点URL（使用 Infura API Key）
RPC_URL=https://sepolia.infura.io/v3/2ed8f259187948c299d2d63352385b42

# 本地测试网 RPC URL
LOCAL_RPC_URL=http://localhost:8545

# 区块链网络ID
CHAIN_ID=11155111  # Sepolia
LOCAL_CHAIN_ID=31337  # Anvil 本地网络

# Etherscan API Key（用于合约验证，本地测试不需要）
ETHERSCAN_API_KEY=

# 测试网络配置
IS_LOCAL=true  # 设置为 true 时使用本地网络，false 时使用 Sepolia
```

## Anvil 测试账户信息

Anvil 提供了 10 个测试账户，第一个账户的信息如下：

- 地址: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
- 私钥: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
- 余额: 10000 ETH

## 使用说明

1. 创建 `.env` 文件：
```bash
cd contracts
cp ENV_CONFIG.md .env
```

2. 修改部署脚本以支持本地测试网：
```solidity
// 在 DeployBLSNodeRegistry.s.sol 中
string memory rpcUrl = vm.envBool("IS_LOCAL") ? vm.envString("LOCAL_RPC_URL") : vm.envString("RPC_URL");
```

3. 部署到本地测试网：
```bash
forge script script/DeployBLSNodeRegistry.s.sol --rpc-url http://localhost:8545 --broadcast
``` 