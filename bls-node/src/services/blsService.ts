import { bls } from '@noble/bls12-381';
import { ethers } from 'ethers';
import config from '../config/config';
import logger from '../utils/logger';

export class BLSService {
  private readonly privateKey: Uint8Array;
  private readonly publicKey: Uint8Array;
  private readonly provider: ethers.JsonRpcProvider;

  constructor() {
    // 初始化 BLS 密钥
    this.privateKey = ethers.getBytes(config.bls.privateKey);
    this.publicKey = ethers.getBytes(config.bls.publicKey);
    this.provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
  }

  /**
   * 对消息进行 BLS 签名
   * @param message 要签名的消息
   * @returns BLS 签名
   */
  async sign(message: string): Promise<string> {
    try {
      logger.info(`Signing message: ${message}`);
      
      // 将消息转换为字节数组
      const messageBytes = ethers.getBytes(ethers.hashMessage(message));
      
      // 使用 BLS 私钥签名
      const signature = await bls.sign(messageBytes, this.privateKey);
      
      // 将签名转换为十六进制字符串
      const signatureHex = ethers.hexlify(signature);
      
      logger.info(`Message signed successfully`);
      return signatureHex;
    } catch (error) {
      logger.error(`Error signing message: ${error}`);
      throw new Error(`Failed to sign message: ${error}`);
    }
  }

  /**
   * 验证 BLS 签名
   * @param message 原始消息
   * @param signature BLS 签名
   * @param publicKey 公钥
   * @returns 签名是否有效
   */
  async verify(message: string, signature: string, publicKey: string): Promise<boolean> {
    try {
      logger.info(`Verifying signature for message: ${message}`);
      
      // 将消息转换为字节数组
      const messageBytes = ethers.getBytes(ethers.hashMessage(message));
      
      // 将签名和公钥转换为字节数组
      const signatureBytes = ethers.getBytes(signature);
      const publicKeyBytes = ethers.getBytes(publicKey);
      
      // 验证签名
      const isValid = await bls.verify(signatureBytes, messageBytes, publicKeyBytes);
      
      logger.info(`Signature verification result: ${isValid}`);
      return isValid;
    } catch (error) {
      logger.error(`Error verifying signature: ${error}`);
      throw new Error(`Failed to verify signature: ${error}`);
    }
  }

  /**
   * 聚合多个 BLS 签名
   * @param signatures 要聚合的签名列表
   * @returns 聚合后的签名
   */
  async aggregateSignatures(signatures: string[]): Promise<string> {
    try {
      logger.info(`Aggregating ${signatures.length} signatures`);
      
      // 将签名转换为字节数组
      const signatureBytes = signatures.map(sig => ethers.getBytes(sig));
      
      // 聚合签名
      const aggregatedSignature = await bls.aggregateSignatures(signatureBytes);
      
      // 将聚合签名转换为十六进制字符串
      const aggregatedSignatureHex = ethers.hexlify(aggregatedSignature);
      
      logger.info(`Signatures aggregated successfully`);
      return aggregatedSignatureHex;
    } catch (error) {
      logger.error(`Error aggregating signatures: ${error}`);
      throw new Error(`Failed to aggregate signatures: ${error}`);
    }
  }

  /**
   * 获取 BLS 公钥
   * @returns BLS 公钥
   */
  getPublicKey(): string {
    return ethers.hexlify(this.publicKey);
  }
} 