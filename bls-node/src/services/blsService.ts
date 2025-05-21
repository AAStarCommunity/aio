import * as bls from '@noble/bls12-381';
import { randomBytes } from 'crypto';
import config from '../config';
import logger from '../utils/logger';

class BLSService {
  private blsPrivateKey: Uint8Array;
  private blsPublicKey: Uint8Array;

  constructor() {
    try {
      // 如果环境变量中已经有私钥，则使用它，否则生成新的
      if (config.blsPrivateKey && config.blsPrivateKey !== 'your_bls_private_key_here') {
        // 从十六进制字符串恢复私钥
        this.blsPrivateKey = Buffer.from(config.blsPrivateKey, 'hex');
      } else {
        // 生成新的私钥 (32字节随机数)
        this.blsPrivateKey = randomBytes(32);
      }

      // 从私钥生成公钥
      this.blsPublicKey = bls.getPublicKey(this.blsPrivateKey);
      
      logger.info(`BLS服务初始化成功，公钥: ${Buffer.from(this.blsPublicKey).toString('hex')}`);
    } catch (error) {
      logger.error(`BLS服务初始化失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 获取节点的BLS公钥
   */
  getPublicKey(): string {
    return Buffer.from(this.blsPublicKey).toString('hex');
  }

  /**
   * 使用BLS私钥对消息进行签名
   * @param message 需要签名的消息（十六进制字符串）
   */
  async sign(message: string): Promise<string> {
    try {
      // 将十六进制消息转换为Uint8Array
      const messageBytes = Buffer.from(message, 'hex');
      
      // 使用BLS私钥对消息进行签名
      const signature = await bls.sign(messageBytes, this.blsPrivateKey);
      
      // 返回签名的十六进制字符串
      return Buffer.from(signature).toString('hex');
    } catch (error) {
      logger.error(`BLS签名失败: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`BLS签名失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 验证BLS签名
   * @param message 原始消息（十六进制字符串）
   * @param signature 签名（十六进制字符串）
   * @param publicKey 公钥（十六进制字符串）
   */
  async verify(message: string, signature: string, publicKey: string): Promise<boolean> {
    try {
      // 将所有参数转换为Uint8Array
      const messageBytes = Buffer.from(message, 'hex');
      const signatureBytes = Buffer.from(signature, 'hex');
      const publicKeyBytes = Buffer.from(publicKey, 'hex');

      // 验证签名
      return await bls.verify(signatureBytes, messageBytes, publicKeyBytes);
    } catch (error) {
      logger.error(`BLS签名验证失败: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }

  /**
   * 聚合多个BLS签名
   * @param signatures 签名数组（十六进制字符串数组）
   */
  async aggregateSignatures(signatures: string[]): Promise<string> {
    try {
      // 将所有签名转换为Uint8Array数组
      const signatureBytes = signatures.map(sig => Buffer.from(sig, 'hex'));
      
      // 聚合签名
      const aggregatedSignature = bls.aggregateSignatures(signatureBytes);
      
      // 返回聚合签名的十六进制字符串
      return Buffer.from(aggregatedSignature).toString('hex');
    } catch (error) {
      logger.error(`BLS签名聚合失败: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`BLS签名聚合失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * 验证聚合签名
   * @param message 原始消息（十六进制字符串）
   * @param aggregatedSignature 聚合签名（十六进制字符串）
   * @param publicKeys 公钥数组（十六进制字符串数组）
   */
  async verifyAggregatedSignature(
    message: string,
    aggregatedSignature: string,
    publicKeys: string[]
  ): Promise<boolean> {
    try {
      // 将所有参数转换为正确的格式
      const messageBytes = Buffer.from(message, 'hex');
      const aggregatedSignatureBytes = Buffer.from(aggregatedSignature, 'hex');
      const publicKeyBytes = publicKeys.map(pk => Buffer.from(pk, 'hex'));

      // 创建相同消息的数组
      const messages = Array(publicKeyBytes.length).fill(messageBytes);
      
      // 验证聚合签名
      return await bls.verifyBatch(aggregatedSignatureBytes, messages, publicKeyBytes);
    } catch (error) {
      logger.error(`BLS聚合签名验证失败: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
}

// 创建单例
export default new BLSService(); 