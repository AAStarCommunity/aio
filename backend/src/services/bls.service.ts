import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { bls12_381 as bls } from '@noble/curves/bls12-381';
import { ethers } from 'ethers';
import { UserOperation } from '../types/userOperation.type';
import logger from '../utils/logger';

@Injectable()
export class BLSService {
  private readonly privateKey: string;
  private readonly publicKey: Uint8Array;
  private readonly provider: ethers.JsonRpcProvider;

  constructor(private readonly configService: ConfigService) {
    try {
      const privateKeyHex = this.configService.get<string>('bls.privateKey');
      if (!privateKeyHex) {
        throw new Error('BLS private key is not configured');
      }

      // 确保私钥是正确的格式
      this.privateKey = privateKeyHex.startsWith('0x') ? privateKeyHex.slice(2) : privateKeyHex;
      
      // 从私钥生成公钥
      this.publicKey = bls.getPublicKey(this.privateKey);
      
      this.provider = new ethers.JsonRpcProvider(this.configService.get('ethereum.rpcUrl'));
      
      logger.info(`BLS service initialized successfully with public key: ${ethers.hexlify(this.publicKey)}`);
    } catch (error) {
      logger.error(`Failed to initialize BLS service: ${error}`);
      throw error;
    }
  }

  /**
   * 计算UserOperation的哈希
   */
  calculateUserOpHash(userOp: UserOperation): string {
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedData = abiCoder.encode(
      ['address', 'uint256', 'bytes', 'bytes', 'uint256', 'uint256', 'uint256', 'uint256', 'uint256', 'bytes', 'bytes'],
      [
        userOp.sender,
        userOp.nonce,
        userOp.initCode,
        userOp.callData,
        userOp.callGasLimit,
        userOp.verificationGasLimit,
        userOp.preVerificationGas,
        userOp.maxFeePerGas,
        userOp.maxPriorityFeePerGas,
        userOp.paymasterAndData,
        userOp.signature
      ]
    );
    return ethers.keccak256(encodedData);
  }

  /**
   * 对消息进行 BLS 签名
   * @param message 要签名的消息
   * @returns BLS 签名（十六进制字符串）
   */
  async sign(message: string): Promise<string> {
    try {
      if (!message) {
        throw new Error('Message is required');
      }
      
      logger.info(`Signing message: ${message}`);
      
      // 将消息转换为字节数组
      const messageBytes = ethers.getBytes(ethers.hashMessage(message));
      logger.debug(`Message bytes: ${ethers.hexlify(messageBytes)}`);
      
      // 使用 BLS 私钥签名
      const signature = await bls.sign(messageBytes, this.privateKey);
      logger.debug(`Generated signature: ${ethers.hexlify(signature)}`);
      
      const hexSignature = ethers.hexlify(signature);
      logger.info(`Message signed successfully with signature: ${hexSignature}`);
      
      return hexSignature;
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
  async verify(message: string, signature: string, publicKey?: string): Promise<boolean> {
    try {
      if (!message || !signature) {
        throw new Error('Message and signature are required');
      }
      
      // 如果未提供公钥，使用当前实例的公钥
      const pubKey = publicKey || this.getPublicKey();
      
      logger.info(`Verifying signature for message: ${message}`);
      logger.debug(`Signature: ${signature}`);
      logger.debug(`Public key: ${pubKey}`);
      
      // 将消息转换为字节数组
      const messageBytes = ethers.getBytes(ethers.hashMessage(message));
      
      // 将签名和公钥转换为 Uint8Array
      const signatureBytes = ethers.getBytes(signature);
      const publicKeyBytes = ethers.getBytes(pubKey);
      
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
   * 获取 BLS 公钥
   * @returns BLS 公钥（十六进制字符串）
   */
  getPublicKey(): string {
    try {
      const publicKeyHex = ethers.hexlify(this.publicKey);
      logger.debug(`Retrieved public key: ${publicKeyHex}`);
      return publicKeyHex;
    } catch (error) {
      logger.error('Error getting public key:', error);
      throw error;
    }
  }

  /**
   * 聚合多个 BLS 签名
   * @param signatures 要聚合的签名列表（十六进制字符串数组）
   * @returns 聚合后的签名（十六进制字符串）
   */
  async aggregateSignatures(signatures: string[]): Promise<string> {
    try {
      if (!signatures || !signatures.length) {
        throw new Error('No signatures provided');
      }
      
      logger.info(`Aggregating ${signatures.length} signatures`);
      logger.debug(`Signatures to aggregate: ${signatures.join(', ')}`);
      
      const signatureBytes = signatures.map(sig => ethers.getBytes(sig));
      const aggregatedSignature = await bls.aggregateSignatures(signatureBytes);
      
      const hexSignature = ethers.hexlify(aggregatedSignature);
      logger.info(`Signatures aggregated successfully: ${hexSignature}`);
      
      return hexSignature;
    } catch (error) {
      logger.error('Error aggregating signatures:', error);
      throw error;
    }
  }

  /**
   * 聚合多个 BLS 公钥
   * @param publicKeys BLS 公钥列表（十六进制字符串数组）
   * @returns 聚合后的公钥（十六进制字符串）
   */
  aggregatePublicKeys(publicKeys: string[]): string {
    try {
      if (!publicKeys || !publicKeys.length) {
        throw new Error('No public keys provided');
      }
      
      logger.info(`Aggregating ${publicKeys.length} public keys`);
      logger.debug(`Public keys to aggregate: ${publicKeys.join(', ')}`);
      
      const publicKeyBytes = publicKeys.map(pk => ethers.getBytes(pk));
      const aggregatedKey = bls.aggregatePublicKeys(publicKeyBytes);
      
      const hexKey = ethers.hexlify(aggregatedKey);
      logger.info(`Public keys aggregated successfully: ${hexKey}`);
      
      return hexKey;
    } catch (error) {
      logger.error('Error aggregating public keys:', error);
      throw error;
    }
  }

  /**
   * 验证聚合签名
   * @param message 原始消息
   * @param aggregatedSignature 聚合后的签名（十六进制字符串）
   * @param publicKeys 公钥列表（十六进制字符串数组）
   * @returns 签名是否有效
   */
  async verifyAggregatedSignature(
    message: string,
    aggregatedSignature: string,
    publicKeys: string[]
  ): Promise<boolean> {
    try {
      if (!message || !aggregatedSignature || !publicKeys || !publicKeys.length) {
        throw new Error('Message, aggregated signature and public keys are required');
      }
      
      logger.info(`Verifying aggregated signature for message: ${message}`);
      logger.debug(`Aggregated signature: ${aggregatedSignature}`);
      logger.debug(`Public keys: ${publicKeys.join(', ')}`);
      
      const aggregatedKey = this.aggregatePublicKeys(publicKeys);
      
      const isValid = await this.verify(message, aggregatedSignature, aggregatedKey);
      
      logger.info(`Aggregated signature verification result: ${isValid}`);
      return isValid;
    } catch (error) {
      logger.error('Error verifying aggregated signature:', error);
      throw error;
    }
  }

  /**
   * 对UserOperation进行签名
   */
  async signUserOperation(userOp: UserOperation): Promise<string> {
    try {
      const messageHash = this.calculateUserOpHash(userOp);
      logger.info(`Signing user operation with hash: ${messageHash}`);
      return await this.sign(messageHash);
    } catch (error) {
      logger.error(`Error signing user operation: ${error}`);
      throw error;
    }
  }

  /**
   * 验证UserOperation的签名
   */
  async verifyUserOperationSignature(userOp: UserOperation, signature: string): Promise<boolean> {
    try {
      const messageHash = this.calculateUserOpHash(userOp);
      logger.info(`Verifying user operation signature with hash: ${messageHash}`);
      return await this.verify(messageHash, signature);
    } catch (error) {
      logger.error(`Error verifying user operation signature: ${error}`);
      return false;
    }
  }
} 