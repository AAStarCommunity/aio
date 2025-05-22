## Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

-   **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
-   **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
-   **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
-   **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```

# AAStar 智能合约模块

AAStar 项目的智能合约模块，实现了基于账户抽象技术的以太坊交易功能。

## 架构概述

该模块包含以下核心组件：

1. **AAAccount.sol**：实现账户抽象功能的智能合约，支持BLS签名验证。
2. **AAAccountFactory.sol**：使用CREATE2部署AA账户合约，实现确定性地址生成。
3. **EntryPoint.sol**：实现ERC-4337标准的EntryPoint合约，处理UserOperation。
4. **AAPaymaster.sol**：为用户支付Gas费用的Paymaster合约。
5. **BLSSignatureVerifier.sol**：实现链上BLS签名验证的库。

## 主要功能

- **邮箱+Passkey注册**：用户可以使用邮箱和Passkey创建AA账户。
- **BLS签名验证**：支持BLS签名的验证，包括单个签名和聚合签名。
- **Gas费用代付**：通过Paymaster实现免Gas交易体验。
- **测试模式**：提供测试模式标志，方便开发和测试。

## 安装与使用

### 依赖项

- Foundry (>= 0.8.0)
- Solidity (^0.8.19)
- OpenZeppelin Contracts

### 安装

```bash
forge install
```

### 编译

```bash
forge build
```

### 测试

```bash
forge test
```

### 部署

```bash
# 设置环境变量
export PRIVATE_KEY=your_private_key
export RPC_URL=your_rpc_url

# 部署到测试网
forge script script/DeployAAContracts.s.sol:DeployAAContracts --rpc-url $RPC_URL --broadcast --verify
```

## 合约说明

### AAAccount.sol

账户抽象合约，实现了以下功能：

- 初始化账户，设置所有者和BLS公钥
- 验证UserOperation的BLS签名
- 执行交易
- 支持测试模式，方便开发

### AAAccountFactory.sol

账户工厂合约，负责创建新的AA账户：

- 使用CREATE2确保地址确定性
- 允许计算账户地址（在创建之前）

### EntryPoint.sol

ERC-4337 EntryPoint合约，处理用户操作：

- 验证用户操作的签名
- 执行用户请求的交易
- 处理Gas费用支付

### AAPaymaster.sol

为用户支付Gas费用的Paymaster合约：

- 支持免费配额机制
- 支持使用ERC20代币支付Gas费用
- 支持退款逻辑

### BLSSignatureVerifier.sol

BLS签名验证库：

- 验证单个BLS签名
- 验证聚合BLS签名
- 支持哈希到曲线点的映射

## 开发说明

### 测试模式

为了方便开发和测试，AAAccount合约提供了测试模式标志。在测试模式下，签名验证将被跳过，允许使用任意签名。

```solidity
// 设置测试模式
function setTestingMode(bool _isTesting) external onlyOwner {
    isTesting = _isTesting;
}
```

### 扩展功能

要添加新功能，可以扩展AAAccount合约或创建新的模块：

1. **多签支持**：扩展验证逻辑，支持多重签名。
2. **社交恢复**：添加社交恢复机制。
3. **批量交易**：优化批量交易处理逻辑。

## 许可证

MIT

# BLS 节点注册合约

## 合约说明

BLS 节点注册合约（`BLSNodeRegistry`）用于管理 BLS 节点的注册和状态。它提供以下功能：

- 节点注册和注销
- 节点状态管理（激活/停用）
- 节点信息查询
- 活跃节点列表获取

## 开发环境

- Solidity ^0.8.19
- Foundry

## 目录结构

```
contracts/
├── src/
│   ├── BLSNodeRegistry.sol        # 主合约
│   └── interfaces/
│       └── IBLSNodeRegistry.sol   # 合约接口
├── script/
│   └── DeployBLSNodeRegistry.s.sol # 部署脚本
└── test/
    └── BLSNodeRegistry.t.sol      # 测试用例
```

## 测试

运行所有测试：

```bash
forge test
```

运行特定测试：

```bash
forge test --match-test testRegisterNode
```

查看测试覆盖率：

```bash
forge coverage
```

## 部署

1. 设置环境变量：

```bash
# 创建 .env 文件
cp .env.example .env

# 编辑 .env 文件，设置以下变量：
PRIVATE_KEY=your_private_key
RPC_URL=your_rpc_url
```

2. 部署到测试网：

```bash
# Sepolia 测试网
forge script script/DeployBLSNodeRegistry.s.sol --rpc-url $RPC_URL --broadcast --verify

# 本地测试网
forge script script/DeployBLSNodeRegistry.s.sol --rpc-url http://localhost:8545 --broadcast
```

## 合约地址

- Sepolia: [待部署]
- Mainnet: [待部署]

## 合约接口

### 注册节点
```solidity
function registerNode(
    string calldata nodeId,
    bytes calldata publicKey,
    string calldata url
) external;
```

### 停用节点
```solidity
function deactivateNode(string calldata nodeId) external;
```

### 激活节点
```solidity
function activateNode(string calldata nodeId) external;
```

### 更新节点URL
```solidity
function updateNodeUrl(
    string calldata nodeId,
    string calldata newUrl
) external;
```

### 获取节点信息
```solidity
function getNode(string calldata nodeId) external view returns (
    bytes memory publicKey,
    string memory url,
    bool isActive,
    uint256 registeredAt
);
```

### 获取活跃节点列表
```solidity
function getActiveNodes() external view returns (
    string[] memory activeNodeIds,
    bytes[] memory publicKeys,
    string[] memory urls
);
```

## 事件

- `NodeRegistered(string indexed nodeId, bytes publicKey, string url)`
- `NodeDeactivated(string indexed nodeId)`
- `NodeActivated(string indexed nodeId)`
- `NodeUpdated(string indexed nodeId, string url)`

## 安全考虑

1. 公钥长度验证：合约会验证 BLS 公钥长度必须为 48 字节
2. 重复注册检查：同一个节点ID不能重复注册
3. 空值检查：nodeId 和 url 不能为空
4. 访问控制：合约继承自 OpenZeppelin 的 `Ownable`，关键操作需要所有者权限
