import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BlsNode, BlsNodeStatus, BlsRegistrationRequest, BlsHeartbeatRequest, BlsSignRequest, BlsSignResponse } from '../interfaces/bls.interface';
import { BlsNodeEntity } from '../entities/bls.node.entity';
import { ConfigService } from '@nestjs/config';
import { ethers } from 'ethers';
import axios from 'axios';
import * as bls from '@noble/bls12-381';

@Injectable()
export class BlsNodeService {
  private readonly heartbeatInterval = 30000; // 30 seconds
  private readonly heartbeatTimeout = 90000; // 90 seconds

  constructor(
    @InjectRepository(BlsNodeEntity)
    private readonly blsNodeRepository: Repository<BlsNodeEntity>,
    private readonly configService: ConfigService,
  ) {
    // 启动节点状态监控
    this.startNodeStatusMonitor();
  }

  async registerNode(request: BlsRegistrationRequest): Promise<BlsNode> {
    // 验证 BLS 公钥格式
    if (!this.isValidBlsPublicKey(request.publicKey)) {
      throw new Error('Invalid BLS public key format');
    }

    // 验证节点端点可访问性
    try {
      await axios.get(`${request.endpoint}/health`);
    } catch (error) {
      throw new Error('Node endpoint is not accessible');
    }

    // 创建新节点记录
    const node = this.blsNodeRepository.create({
      publicKey: request.publicKey,
      endpoint: request.endpoint,
      status: BlsNodeStatus.ACTIVE,
      lastHeartbeat: new Date(),
      registeredAt: new Date(),
    });

    // 保存节点信息
    return this.blsNodeRepository.save(node);
  }

  async updateNodeHeartbeat(request: BlsHeartbeatRequest): Promise<void> {
    // 获取节点信息
    const node = await this.blsNodeRepository.findOne({ where: { id: request.nodeId } });
    if (!node) {
      throw new Error('Node not found');
    }

    // 验证心跳签名
    const isValidSignature = await this.verifyHeartbeatSignature(
      request.nodeId,
      request.timestamp,
      request.signature,
      node.publicKey,
    );
    if (!isValidSignature) {
      throw new Error('Invalid heartbeat signature');
    }

    // 更新节点心跳时间
    await this.blsNodeRepository.update(node.id, {
      lastHeartbeat: request.timestamp,
      status: BlsNodeStatus.ACTIVE,
    });
  }

  async requestSignature(nodeId: string, request: BlsSignRequest): Promise<BlsSignResponse> {
    // 获取节点信息
    const node = await this.blsNodeRepository.findOne({ where: { id: nodeId } });
    if (!node || node.status !== BlsNodeStatus.ACTIVE) {
      throw new Error('Node is not available');
    }

    try {
      const startTime = Date.now();
      // 发送签名请求到节点
      const response = await axios.post(`${node.endpoint}/sign`, request);
      const endTime = Date.now();

      // 更新节点性能统计
      await this.updateNodeStats(node.id, true, endTime - startTime);

      return response.data;
    } catch (error) {
      // 更新节点性能统计
      await this.updateNodeStats(node.id, false);

      // 如果节点响应失败，标记节点状态为不活跃
      await this.blsNodeRepository.update(node.id, { status: BlsNodeStatus.INACTIVE });
      throw new Error('Failed to get signature from node');
    }
  }

  async aggregateSignatures(signatures: BlsSignResponse[]): Promise<string> {
    if (signatures.length === 0) {
      throw new Error('No signatures to aggregate');
    }

    try {
      // 将所有签名转换为 Uint8Array
      const signatureBuffers = signatures.map(sig => 
        Buffer.from(sig.signature.replace('0x', ''), 'hex')
      );

      // 聚合签名
      const aggregatedSignature = await bls.aggregateSignatures(signatureBuffers);
      return '0x' + Buffer.from(aggregatedSignature).toString('hex');
    } catch (error) {
      throw new Error('Failed to aggregate signatures');
    }
  }

  async getActiveNodes(): Promise<BlsNode[]> {
    return this.blsNodeRepository.find({
      where: { status: BlsNodeStatus.ACTIVE },
      order: { successfulRequestCount: 'DESC' },
    });
  }

  async getNodeStatus(nodeId: string): Promise<BlsNode> {
    const node = await this.blsNodeRepository.findOne({ where: { id: nodeId } });
    if (!node) {
      throw new Error('Node not found');
    }
    return node;
  }

  private async startNodeStatusMonitor(): Promise<void> {
    setInterval(async () => {
      const now = new Date();
      const timeoutThreshold = new Date(now.getTime() - this.heartbeatTimeout);

      // 更新超时节点的状态
      await this.blsNodeRepository.update(
        {
          status: BlsNodeStatus.ACTIVE,
          lastHeartbeat: timeoutThreshold,
        },
        { status: BlsNodeStatus.INACTIVE }
      );
    }, this.heartbeatInterval);
  }

  private async updateNodeStats(
    nodeId: string,
    isSuccess: boolean,
    responseTime?: number
  ): Promise<void> {
    const node = await this.blsNodeRepository.findOne({ where: { id: nodeId } });
    if (!node) return;

    if (isSuccess) {
      const newSuccessCount = node.successfulRequestCount + 1;
      const newAvgTime = responseTime
        ? (node.averageResponseTime * node.successfulRequestCount + responseTime) / newSuccessCount
        : node.averageResponseTime;

      await this.blsNodeRepository.update(node.id, {
        successfulRequestCount: newSuccessCount,
        averageResponseTime: newAvgTime,
      });
    } else {
      await this.blsNodeRepository.update(node.id, {
        failedRequestCount: node.failedRequestCount + 1,
      });
    }
  }

  private async verifyHeartbeatSignature(
    nodeId: string,
    timestamp: Date,
    signature: string,
    publicKey: string,
  ): Promise<boolean> {
    try {
      // 构造消息哈希
      const message = ethers.solidityPackedKeccak256(
        ['string', 'uint256'],
        [nodeId, Math.floor(timestamp.getTime() / 1000)]
      );

      // 验证签名
      const messageBuffer = Buffer.from(message.replace('0x', ''), 'hex');
      const signatureBuffer = Buffer.from(signature.replace('0x', ''), 'hex');
      const publicKeyBuffer = Buffer.from(publicKey.replace('0x', ''), 'hex');

      return bls.verify(signatureBuffer, messageBuffer, publicKeyBuffer);
    } catch (error) {
      return false;
    }
  }

  private isValidBlsPublicKey(publicKey: string): boolean {
    try {
      if (!publicKey.startsWith('0x')) {
        return false;
      }
      const buffer = Buffer.from(publicKey.replace('0x', ''), 'hex');
      return buffer.length === 48; // BLS12-381 公钥长度为 48 字节
    } catch {
      return false;
    }
  }
} 