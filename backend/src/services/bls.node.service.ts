import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import * as bls from '@noble/bls12-381';
import { BlsNodeEntity } from '../entities/bls.node.entity';
import {
  BlsNodeStatus,
  BlsRegistrationRequest,
  BlsHeartbeatRequest,
  BlsSignRequest,
  BlsSignResponse,
  BlsSignature,
} from '../interfaces/bls.interface';

@Injectable()
export class BlsNodeService {
  constructor(
    @InjectRepository(BlsNodeEntity)
    private readonly blsNodeRepository: Repository<BlsNodeEntity>,
    private readonly configService: ConfigService,
  ) {}

  async registerNode(request: BlsRegistrationRequest): Promise<BlsNodeEntity> {
    // 验证 BLS 公钥格式
    if (!request.publicKey.startsWith('0x') || request.publicKey.length !== 98) {
      throw new Error('Invalid BLS public key format');
    }

    // 验证节点端点可访问性
    try {
      await axios.get(`${request.endpoint}/health`);
    } catch (error) {
      throw new Error('Node endpoint is not accessible');
    }

    // 创建并保存节点记录
    const node = this.blsNodeRepository.create({
      ...request,
      status: BlsNodeStatus.ACTIVE,
      lastHeartbeat: new Date(),
    });

    return this.blsNodeRepository.save(node);
  }

  async updateNodeHeartbeat(request: BlsHeartbeatRequest): Promise<void> {
    const node = await this.blsNodeRepository.findOne({ where: { id: request.nodeId } });
    if (!node) {
      throw new Error('Node not found');
    }

    // 验证心跳签名
    const isValid = await bls.verify(request.signature, request.timestamp.toString(), node.publicKey);
    if (!isValid) {
      throw new Error('Invalid heartbeat signature');
    }

    // 更新节点状态
    await this.blsNodeRepository.update(node.id, {
      lastHeartbeat: request.timestamp,
      status: BlsNodeStatus.ACTIVE,
    });
  }

  async requestSignature(nodeId: string, request: BlsSignRequest): Promise<BlsSignResponse> {
    const node = await this.blsNodeRepository.findOne({ where: { id: nodeId } });
    if (!node || node.status !== BlsNodeStatus.ACTIVE) {
      throw new Error('Node is not available');
    }

    try {
      const startTime = Date.now();
      const response = await axios.post(`${node.endpoint}/sign`, request);
      const endTime = Date.now();

      // 更新节点性能统计
      await this.blsNodeRepository.update(node.id, {
        successfulRequestCount: node.successfulRequestCount + 1,
        averageResponseTime: (node.averageResponseTime * node.successfulRequestCount + (endTime - startTime)) / (node.successfulRequestCount + 1),
      });

      return response.data;
    } catch (error) {
      // 更新节点失败统计并标记为不可用
      await this.blsNodeRepository.update(node.id, {
        failedRequestCount: node.failedRequestCount + 1,
        status: BlsNodeStatus.INACTIVE,
      });

      throw new Error('Failed to get signature from node');
    }
  }

  async aggregateSignatures(signatures: BlsSignature[]): Promise<string> {
    if (signatures.length === 0) {
      throw new Error('No signatures to aggregate');
    }

    const signatureBuffers = signatures.map(sig => Buffer.from(sig.signature.slice(2), 'hex'));
    const aggregatedSignature = await bls.aggregateSignatures(signatureBuffers);
    return '0x' + Buffer.from(aggregatedSignature).toString('hex');
  }

  async getActiveNodes(): Promise<BlsNodeEntity[]> {
    return this.blsNodeRepository.find({
      where: { status: BlsNodeStatus.ACTIVE },
      order: { successfulRequestCount: 'DESC' },
    });
  }

  async getNodeStatus(nodeId: string): Promise<BlsNodeEntity> {
    const node = await this.blsNodeRepository.findOne({ where: { id: nodeId } });
    if (!node) {
      throw new Error('Node not found');
    }
    return node;
  }
} 