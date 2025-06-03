import { ethers } from 'ethers';
import dotenv from 'dotenv';
import { BLSService } from '../src/services/blsService';
import BLSNodeRegistryABI from '../src/abi/BLSNodeRegistry.json';
import path from 'path';
import fs from 'fs';

// 加载环境变量
dotenv.config();

async function registerNode() {
  try {
    console.log('开始注册BLS节点...');
    
    // 检查必要的环境变量
    const requiredEnvVars = [
      'ETH_RPC_URL',
      'ETH_PRIVATE_KEY',
      'BLS_NODE_REGISTRY_ADDRESS',
      'BLS_PRIVATE_KEY',
      'NODE_ID',
      'NODE_URL'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      throw new Error(`缺少必要的环境变量: ${missingVars.join(', ')}`);
    }
    
    // 设置以太坊提供者和钱包
    const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
    const wallet = new ethers.Wallet(process.env.ETH_PRIVATE_KEY!, provider);
    
    // 初始化BLS服务
    const blsPrivateKey = Buffer.from(process.env.BLS_PRIVATE_KEY!, 'hex');
    const blsService = new BLSService(blsPrivateKey);
    
    // 获取BLS公钥
    const blsPublicKey = blsService.getPublicKey();
    console.log(`BLS公钥: ${blsPublicKey}`);
    
    // 连接到BLSNodeRegistry合约
    const contractAddress = process.env.BLS_NODE_REGISTRY_ADDRESS!;
    const contract = new ethers.Contract(
      contractAddress,
      BLSNodeRegistryABI.abi,
      wallet
    );
    
    // 准备注册参数
    const nodeId = process.env.NODE_ID!;
    const nodeUrl = process.env.NODE_URL!;
    
    console.log(`正在注册节点 ID: ${nodeId}, URL: ${nodeUrl}`);
    
    // 调用合约的registerNode函数
    const tx = await contract.registerNode(
      nodeId,
      nodeUrl,
      blsPublicKey
    );
    
    console.log(`交易已提交，交易哈希: ${tx.hash}`);
    console.log('等待交易确认...');
    
    // 等待交易确认
    const receipt = await tx.wait();
    
    console.log(`交易已确认，区块号: ${receipt.blockNumber}`);
    console.log('节点注册成功！');
    
    // 保存注册信息到文件
    const registrationInfo = {
      nodeId,
      nodeUrl,
      blsPublicKey,
      transactionHash: tx.hash,
      blockNumber: receipt.blockNumber,
      timestamp: new Date().toISOString()
    };
    
    const infoPath = path.resolve(__dirname, '../registration-info.json');
    fs.writeFileSync(infoPath, JSON.stringify(registrationInfo, null, 2));
    console.log(`注册信息已保存到: ${infoPath}`);
    
  } catch (error) {
    console.error('注册节点时出错:', error);
    process.exit(1);
  }
}

// 执行注册函数
registerNode().catch(console.error);