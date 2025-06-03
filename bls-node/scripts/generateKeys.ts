import * as bls from '@noble/bls12-381';
import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 生成BLS密钥对并更新.env文件
 */
async function generateKeys() {
  try {
    console.log('正在生成BLS密钥对...');
    
    // 生成随机私钥
    const privateKeyBytes = ethers.randomBytes(32);
    const privateKeyHex = ethers.hexlify(privateKeyBytes);
    
    // 从私钥生成公钥
    const publicKey = bls.getPublicKey(privateKeyBytes);
    const publicKeyHex = ethers.hexlify(publicKey);
    
    console.log('BLS密钥对生成成功:');
    console.log(`私钥: ${privateKeyHex}`);
    console.log(`公钥: ${publicKeyHex}`);
    
    // 更新.env文件
    const envPath = path.resolve(__dirname, '../.env');
    
    if (fs.existsSync(envPath)) {
      console.log('正在更新.env文件...');
      
      let envContent = fs.readFileSync(envPath, 'utf8');
      
      // 替换BLS_PRIVATE_KEY
      envContent = envContent.replace(
        /BLS_PRIVATE_KEY=.*/,
        `BLS_PRIVATE_KEY=${privateKeyHex.slice(2)}` // 移除0x前缀
      );
      
      // 替换BLS_PUBLIC_KEY
      envContent = envContent.replace(
        /BLS_PUBLIC_KEY=.*/,
        `BLS_PUBLIC_KEY=${publicKeyHex}`
      );
      
      fs.writeFileSync(envPath, envContent);
      console.log('.env文件已更新');
    } else {
      console.warn('.env文件不存在，请手动创建并添加以下内容:');
      console.log(`BLS_PRIVATE_KEY=${privateKeyHex.slice(2)}`);
      console.log(`BLS_PUBLIC_KEY=${publicKeyHex}`);
    }
    
    console.log('\n密钥生成完成！请确保将这些值添加到您的.env文件中。');
  } catch (error) {
    console.error('生成BLS密钥对时出错:', error);
    process.exit(1);
  }
}

// 执行生成密钥函数
generateKeys().catch(console.error);