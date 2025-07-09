# BLS签名转账流程说明

## 概述

本项目现在已经实现了完整的BLS多节点签名转账流程，包括Passkey身份验证、多节点BLS签名、签名聚合和链上验证。

## 完整的转账流程

### 1. 前端Passkey验证
- 用户在前端通过Passkey进行身份验证
- 前端生成challenge并获取用户的生物特征验证
- 获得验证响应(response)、challenge、credentialPublicKey和counter

### 2. 后端Passkey校验
- 后端`PasskeyService`验证Passkey响应
- 确认用户身份有效性
- 验证成功后继续执行签名流程

### 3. 创建UserOperation
- 根据转账参数创建未签名的UserOperation
- 设置合适的gas限制和价格
- 如果启用，配置Paymaster参数

### 4. 多节点BLS签名流程

#### 4.1 选择BLS节点
- `BlsNodeService.selectBestNodes()` 选择最佳的n个BLS节点
- 基于节点成功率和响应时间进行选择
- 默认选择3个节点，可配置

#### 4.2 计算UserOperation哈希
- 使用EIP-4337标准计算UserOperation哈希
- 将signature字段设为空进行哈希计算

#### 4.3 并发请求节点签名
- 向选中的多个BLS节点并发发送签名请求
- 每个节点使用其私钥对UserOperation哈希进行BLS签名
- 收集所有节点的签名响应

#### 4.4 聚合BLS签名
- 使用`@noble/bls12-381`库聚合多个BLS签名
- 生成一个聚合签名，代表所有节点的签名

### 5. 验证聚合签名
- 验证聚合签名的有效性
- 确保签名与原始消息哈希匹配

### 6. 发送到链上
- 将包含聚合签名的UserOperation发送到Bundler
- Bundler将交易包含在区块中
- 智能合约验证BLS签名并执行交易

## 技术架构

### 核心服务

1. **PasskeyService** - Passkey身份验证
2. **BlsSignatureService** - BLS签名管理和协调
3. **BlsNodeService** - BLS节点管理和通信
4. **UserOperationService** - 用户操作生命周期管理
5. **BundlerService** - 与ERC-4337 Bundler通信

### API接口

#### 完整BLS签名转账
```typescript
POST /api/userop/signed
{
  "accountAddress": "0x...",
  "txRequest": {
    "to": "0x...",
    "value": "0.1",
    "data": "0x",
    "operation": 0
  },
  "paymasterEnabled": false,
  "passkeyVerification": {
    "challenge": "...",
    "response": {...},
    "credentialPublicKey": "...",
    "counter": 123
  },
  "requiredNodeCount": 3
}
```

#### 准备签名（不发送）
```typescript
POST /api/userop/prepare
// 相同的参数，但只返回签名后的UserOperation，不发送到链上
```

### 前端集成

```typescript
// 使用新的带BLS签名的转账API
const result = await api.transfer.createAndSendSignedTransfer({
  accountAddress: user.aaAddress,
  to: recipientAddress,
  value: ethers.parseEther(amount).toString(),
  passkeyVerification: {
    challenge: challenge,
    response: passkeyResponse,
    credentialPublicKey: credentialPublicKeyBase64,
    counter: credentialCounter
  },
  requiredNodeCount: 3
});
```

## 安全特性

### 多重验证
1. **Passkey验证** - 用户身份确认
2. **多节点BLS签名** - 分布式签名验证
3. **聚合签名验证** - 数学保证签名完整性
4. **链上验证** - 智能合约最终验证

### 容错机制
- 自动选择最佳BLS节点
- 节点健康状态监控
- 失败节点自动标记和排除
- 签名验证失败时的错误处理

## 配置说明

### 环境变量
```bash
# BLS节点相关
BLS_NODE_URL=http://localhost:3001
RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID

# 数据库配置
MONGODB_URI=mongodb://localhost:27017/airaccount

# Bundler配置
PIMLICO_API_KEY=your_pimlico_api_key
```

### BLS节点要求
- 至少需要1个BLS节点才能工作
- 推荐3个或更多节点以提供冗余
- 节点需要支持健康检查接口 `/health`
- 节点需要支持签名接口 `/sign`

## 监控和日志

### 关键日志
- Passkey验证结果
- BLS节点选择和健康状态
- 签名请求和响应时间
- 聚合签名生成和验证
- 交易发送结果

### 性能指标
- 节点响应时间
- 签名成功率
- 聚合签名延迟
- 端到端交易时间

## 故障排除

### 常见问题

1. **Passkey验证失败**
   - 检查challenge是否正确
   - 确认credentialPublicKey格式正确
   - 验证counter值是否递增

2. **BLS节点不可用**
   - 检查节点健康状态
   - 确认网络连接
   - 查看节点日志

3. **签名聚合失败**
   - 验证所有节点签名格式正确
   - 检查签名数量是否符合要求
   - 确认聚合算法配置正确

4. **交易发送失败**
   - 检查Bundler连接状态
   - 验证gas估算是否正确
   - 确认账户余额充足

## 开发和测试

### 单元测试
- 每个服务都有对应的测试文件
- 包含成功和失败场景测试
- 模拟BLS节点和Bundler响应

### 集成测试
- 端到端转账流程测试
- 多节点签名和聚合测试
- 故障恢复测试

### 性能测试
- 高并发签名请求测试
- 大量签名聚合测试
- 长期稳定性测试

## 升级和扩展

### 未来改进
- 支持更多BLS曲线
- 实现更智能的节点选择算法
- 添加签名缓存机制
- 支持批量交易签名

### 扩展性
- 水平扩展BLS节点
- 支持多种Bundler
- 集成更多身份验证方式
- 支持跨链签名 