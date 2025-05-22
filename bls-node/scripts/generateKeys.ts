import * as bls from '@noble/bls12-381';
import { ethers } from 'ethers';

async function generateKeys() {
  try {
    // 生成随机私钥
    const privateKey = ethers.randomBytes(32);
    
    // 从私钥生成公钥
    const publicKey = await bls.getPublicKey(privateKey);
    
    console.log('BLS密钥对生成成功：');
    console.log('私钥：', ethers.hexlify(privateKey));
    console.log('公钥：', ethers.hexlify(publicKey));
    
  } catch (error) {
    console.error('生成密钥对时出错：', error);
  }
}

generateKeys(); 