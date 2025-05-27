import axios from 'axios';
import { ethers } from 'ethers';
import { UserOperation } from '../types/userOperation.type';

export class BLSService {
  private readonly nodeUrl: string;
  private readonly provider: ethers.JsonRpcProvider;

  constructor(nodeUrl: string = process.env.BLS_NODE_URL || 'http://localhost:3001') {
    this.nodeUrl = nodeUrl;
    this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  }

  /**
   * 检查BLS节点健康状态
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.nodeUrl}/health`);
      return response.data.status === 'healthy';
    } catch (error) {
      console.error('Failed to check BLS node health:', error);
      return false;
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
   * 获取BLS签名
   */
  async sign(messageHash: string): Promise<string> {
    try {
      const response = await axios.post(`${this.nodeUrl}/sign`, {
        messageHash
      });
      return response.data.signature;
    } catch (error) {
      console.error('Failed to get BLS signature:', error);
      throw new Error('Failed to get BLS signature');
    }
  }

  /**
   * 验证BLS签名
   */
  async verify(messageHash: string, signature: string): Promise<boolean> {
    try {
      const response = await axios.post(`${this.nodeUrl}/verify`, {
        messageHash,
        signature
      });
      return response.data.isValid;
    } catch (error) {
      console.error('Failed to verify BLS signature:', error);
      return false;
    }
  }

  /**
   * 对UserOperation进行签名
   */
  async signUserOperation(userOp: UserOperation): Promise<string> {
    const messageHash = this.calculateUserOpHash(userOp);
    return this.sign(messageHash);
  }

  /**
   * 验证UserOperation的签名
   */
  async verifyUserOperationSignature(userOp: UserOperation, signature: string): Promise<boolean> {
    const messageHash = this.calculateUserOpHash(userOp);
    return this.verify(messageHash, signature);
  }
} 