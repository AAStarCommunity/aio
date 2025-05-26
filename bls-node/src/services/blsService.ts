import { bls12_381 as bls } from '@noble/curves/bls12-381';
import { ethers } from 'ethers';
import config from '../config/config';
import logger from '../utils/logger';

export class BLSService {
  private privateKey: Buffer;
  private readonly publicKey: Uint8Array;
  private readonly provider: ethers.JsonRpcProvider;

  constructor(privateKey: Buffer) {
    this.privateKey = privateKey;
    this.publicKey = ethers.getBytes(config.bls.publicKey);
    this.provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
  }

  /**
   * 对消息进行 BLS 签名
   * @param message 要签名的消息
   * @returns BLS 签名（十六进制字符串）
   */
  async sign(message: string): Promise<string> {
    try {
      logger.info(`Signing message: ${message}`);
      
      // 将消息转换为字节数组
      const messageBytes = ethers.getBytes(ethers.hashMessage(message));
      
      // 使用 BLS 私钥签名
      const signature = await bls.sign(messageBytes, this.privateKey.toString('hex'));
      
      logger.info(`Message signed successfully`);
      return ethers.hexlify(signature);
    } catch (error) {
      logger.error(`Error signing message: ${error}`);
      throw new Error(`Failed to sign message: ${error}`);
    }
  }

  /**
   * 验证 BLS 签名
   * @param message 原始消息
   * @param signature BLS 签名（十六进制字符串）
   * @param publicKey BLS 公钥（十六进制字符串）
   * @returns 签名是否有效
   */
  async verify(message: string, signature: string, publicKey: string): Promise<boolean> {
    try {
      logger.info(`Verifying signature for message: ${message}`);
      
      // 将消息转换为字节数组
      const messageBytes = ethers.getBytes(ethers.hashMessage(message));
      
      // 将签名和公钥转换为 Uint8Array
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
   * @param signatures 要聚合的签名列表（十六进制字符串数组）
   * @returns 聚合后的签名（十六进制字符串）
   */
  async aggregateSignatures(signatures: string[]): Promise<string> {
    if (!signatures.length) {
      throw new Error('No signatures provided');
    }
    try {
      logger.info(`Aggregating ${signatures.length} signatures`);
      const signatureBytes = signatures.map(sig => ethers.getBytes(sig));
      const aggregatedSignature = await bls.aggregateSignatures(signatureBytes);
      logger.info('Signatures aggregated successfully');
      return ethers.hexlify(aggregatedSignature);
    } catch (error) {
      logger.error('Error aggregating signatures:', error);
      throw error;
    }
  }

  /**
   * 获取 BLS 公钥
   * @returns BLS 公钥（十六进制字符串）
   */
  getPublicKey(): string {
    try {
      const publicKey = bls.getPublicKey(this.privateKey.toString('hex'));
      return ethers.hexlify(publicKey);
    } catch (error) {
      logger.error('Error generating public key:', error);
      throw error;
    }
  }

  /**
   * 聚合多个 BLS 公钥
   * @param publicKeys BLS 公钥列表（十六进制字符串数组）
   * @returns 聚合后的公钥（十六进制字符串）
   */
  public aggregatePublicKeys(publicKeys: string[]): string {
    if (!publicKeys.length) {
      throw new Error('No public keys provided');
    }
    const publicKeyBytes = publicKeys.map(pk => ethers.getBytes(pk));
    const aggregatedKey = bls.aggregatePublicKeys(publicKeyBytes);
    return ethers.hexlify(aggregatedKey);
  }

  /**
   * 验证聚合签名
   * @param message 原始消息
   * @param aggregatedSignature 聚合后的签名（十六进制字符串）
   * @param publicKeys 公钥列表（十六进制字符串数组）
   * @returns 签名是否有效
   */
  public async verifyAggregatedSignature(
    message: string,
    aggregatedSignature: string,
    publicKeys: string[]
  ): Promise<boolean> {
    try {
      logger.info(`Verifying aggregated signature for message: ${message}`);
      const messageBytes = ethers.getBytes(ethers.hashMessage(message));
      const signatureBytes = ethers.getBytes(aggregatedSignature);
      const publicKeyBytes = publicKeys.map(pk => ethers.getBytes(pk));
      const aggregatedKey = this.aggregatePublicKeys(publicKeys);
      return await this.verify(message, aggregatedSignature, aggregatedKey);
    } catch (error) {
      logger.error('Error verifying aggregated signature:', error);
      throw error;
    }
  }
}

// 创建默认实例
const defaultBLSService = new BLSService(Buffer.from(config.bls.privateKey, 'hex'));
export default defaultBLSService; 