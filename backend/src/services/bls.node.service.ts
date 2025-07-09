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
import logger from '../utils/logger';

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

  /**
   * 获取所有活跃的BLS节点
   * @returns 活跃节点列表
   */
  async getActiveNodes(): Promise<BlsNodeEntity[]> {
    try {
      const activeNodes = await this.blsNodeRepository.find({
        where: { status: BlsNodeStatus.ACTIVE },
        order: { successfulRequestCount: 'DESC', averageResponseTime: 'ASC' }
      });
      
      logger.info(`Found ${activeNodes.length} active BLS nodes`);
      return activeNodes;
    } catch (error) {
      logger.error('Error getting active nodes:', error);
      throw new Error('Failed to get active nodes');
    }
  }

  /**
   * 选择最佳的BLS节点
   * @param count 需要的节点数量
   * @returns 选择的节点列表
   */
  async selectBestNodes(count: number): Promise<BlsNodeEntity[]> {
    try {
      const activeNodes = await this.getActiveNodes();
      
      if (activeNodes.length < count) {
        throw new Error(`Insufficient active nodes: need ${count}, available ${activeNodes.length}`);
      }
      
      // 基于成功率和响应时间选择最佳节点
      const selectedNodes = activeNodes
        .filter(node => {
          const totalRequests = node.successfulRequestCount + node.failedRequestCount;
          const successRate = totalRequests > 0 ? node.successfulRequestCount / totalRequests : 0;
          return successRate >= 0.9; // 只选择成功率90%以上的节点
        })
        .slice(0, count);
      
      if (selectedNodes.length < count) {
        logger.warn(`Only ${selectedNodes.length} high-quality nodes available, but ${count} requested`);
        // 如果高质量节点不够，则从所有活跃节点中选择
        return activeNodes.slice(0, count);
      }
      
      logger.info(`Selected ${selectedNodes.length} best BLS nodes`);
      return selectedNodes;
    } catch (error) {
      logger.error('Error selecting best nodes:', error);
      throw new Error('Failed to select best nodes');
    }
  }

  /**
   * 并发请求多个节点签名
   * @param messageHash 消息哈希
   * @param nodeCount 节点数量
   * @returns 签名结果
   */
  async requestMultipleSignatures(messageHash: string, nodeCount: number = 3): Promise<BlsSignResponse[]> {
    try {
      const selectedNodes = await this.selectBestNodes(nodeCount);
      logger.info(`Requesting signatures from ${selectedNodes.length} nodes`);
      
      const signaturePromises = selectedNodes.map(async (node) => {
        try {
          const response = await this.requestSignature(node.id, {
            userOpHash: messageHash,
            deadline: Math.floor(Date.now() / 1000) + 300 // 5分钟超时
          });
          
          return {
            ...response,
            nodeId: node.id,
            timestamp: new Date()
          };
        } catch (error) {
          logger.error(`Failed to get signature from node ${node.id}:`, error);
          throw new Error(`Node ${node.id} signature failed: ${error.message}`);
        }
      });
      
      const signatures = await Promise.all(signaturePromises);
      logger.info(`Successfully collected ${signatures.length} signatures`);
      
      return signatures;
    } catch (error) {
      logger.error('Error requesting multiple signatures:', error);
      throw new Error('Failed to request multiple signatures');
    }
  }

  /**
   * 验证BLS节点状态并更新
   */
  async updateNodeStatuses(): Promise<void> {
    try {
      const allNodes = await this.blsNodeRepository.find();
      
      const updatePromises = allNodes.map(async (node) => {
        try {
          // 检查节点健康状态
          const response = await axios.get(`${node.endpoint}/health`, { timeout: 5000 });
          
          if (response.status === 200) {
            // 节点正常，更新为活跃状态
            await this.blsNodeRepository.update(node.id, {
              status: BlsNodeStatus.ACTIVE,
              lastHeartbeat: new Date()
            });
          }
        } catch (error) {
          // 节点不可用，标记为非活跃
          await this.blsNodeRepository.update(node.id, {
            status: BlsNodeStatus.INACTIVE
          });
          logger.warn(`Node ${node.id} marked as inactive: ${error.message}`);
        }
      });
      
      await Promise.all(updatePromises);
      logger.info('Node status update completed');
    } catch (error) {
      logger.error('Error updating node statuses:', error);
    }
  }

  /**
   * 获取节点统计信息
   */
  async getNodeStatistics(): Promise<any> {
    try {
      const activeNodes = await this.getActiveNodes();
      const inactiveNodes = await this.blsNodeRepository.find({
        where: { status: BlsNodeStatus.INACTIVE }
      });
      
      const statistics = {
        totalNodes: activeNodes.length + inactiveNodes.length,
        activeNodes: activeNodes.length,
        inactiveNodes: inactiveNodes.length,
        averageResponseTime: activeNodes.reduce((sum, node) => sum + node.averageResponseTime, 0) / (activeNodes.length || 1),
        totalRequests: activeNodes.reduce((sum, node) => sum + node.successfulRequestCount + node.failedRequestCount, 0),
        successfulRequests: activeNodes.reduce((sum, node) => sum + node.successfulRequestCount, 0),
        failedRequests: activeNodes.reduce((sum, node) => sum + node.failedRequestCount, 0)
      };
      
      return statistics;
    } catch (error) {
      logger.error('Error getting node statistics:', error);
      throw new Error('Failed to get node statistics');
    }
  }

  async getNodeStatus(nodeId: string): Promise<BlsNodeEntity> {
    const node = await this.blsNodeRepository.findOne({ where: { id: nodeId } });
    if (!node) {
      throw new Error('Node not found');
    }
    return node;
  }
} 