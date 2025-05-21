import fetch from 'node-fetch';
import config from '../config';
import logger from '../utils/logger';
import blsService from './blsService';

interface NodeInfo {
  nodeId: string;
  publicKey: string;
  url: string;
}

interface SignatureRequest {
  messageHash: string;
  userId: string;
}

interface SignatureResponse {
  nodeId: string;
  signature: string;
  publicKey: string;
}

class NodeService {
  private nodes: Map<string, NodeInfo> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    // 将自己加入节点列表
    this.addNode({
      nodeId: config.nodeId,
      publicKey: blsService.getPublicKey(),
      url: config.isMasterNode ? config.masterNodeUrl : ''
    });
  }

  /**
   * 初始化节点服务
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      if (!config.isMasterNode) {
        // 非主节点需要向主节点注册
        await this.registerWithMasterNode();
      }

      logger.info('节点服务初始化成功');
      this.isInitialized = true;
    } catch (error) {
      logger.error(`节点服务初始化失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 向主节点注册
   */
  private async registerWithMasterNode() {
    try {
      const response = await fetch(`${config.masterNodeUrl}/api/nodes/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nodeId: config.nodeId,
          publicKey: blsService.getPublicKey(),
          url: `http://localhost:${config.port}` // 注意：实际应用中应该使用真实的外部URL
        }),
      });

      if (!response.ok) {
        throw new Error(`向主节点注册失败: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.info(`成功向主节点注册: ${JSON.stringify(data)}`);

      // 获取其他节点信息
      await this.fetchNodesFromMasterNode();
    } catch (error) {
      logger.error(`向主节点注册失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 从主节点获取节点列表
   */
  private async fetchNodesFromMasterNode() {
    try {
      const response = await fetch(`${config.masterNodeUrl}/api/nodes`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`获取节点列表失败: ${response.status} ${response.statusText}`);
      }

      const nodes = await response.json() as NodeInfo[];
      
      // 更新节点列表
      nodes.forEach((node: NodeInfo) => {
        if (node.nodeId !== config.nodeId) {
          this.addNode(node);
        }
      });

      logger.info(`成功获取节点列表，共 ${this.nodes.size} 个节点`);
    } catch (error) {
      logger.error(`获取节点列表失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 添加节点
   */
  addNode(node: NodeInfo) {
    this.nodes.set(node.nodeId, node);
    logger.info(`添加节点: ${node.nodeId}`);
  }

  /**
   * 移除节点
   */
  removeNode(nodeId: string) {
    this.nodes.delete(nodeId);
    logger.info(`移除节点: ${nodeId}`);
  }

  /**
   * 获取所有节点
   */
  getAllNodes(): NodeInfo[] {
    return Array.from(this.nodes.values());
  }

  /**
   * 向其他节点请求签名
   */
  async requestSignaturesFromNodes(request: SignatureRequest): Promise<SignatureResponse[]> {
    const signatures: SignatureResponse[] = [];
    const nodes = this.getAllNodes();

    // 如果是主节点，向所有其他节点请求签名
    if (config.isMasterNode) {
      const signaturePromises = nodes
        .filter(node => node.nodeId !== config.nodeId && node.url) // 排除自己和没有URL的节点
        .map(async (node) => {
          try {
            const response = await fetch(`${node.url}/api/sign`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(request),
            });

            if (!response.ok) {
              logger.warn(`从节点 ${node.nodeId} 获取签名失败: ${response.status} ${response.statusText}`);
              return null;
            }

            const data = await response.json() as { signature: string };
            logger.info(`成功从节点 ${node.nodeId} 获取签名`);
            return {
              nodeId: node.nodeId,
              signature: data.signature,
              publicKey: node.publicKey
            };
          } catch (error) {
            logger.error(`从节点 ${node.nodeId} 获取签名出错: ${error instanceof Error ? error.message : String(error)}`);
            return null;
          }
        });

      const results = await Promise.all(signaturePromises);
      signatures.push(...results.filter((result): result is SignatureResponse => result !== null));
    }

    // 添加自己的签名
    try {
      const signature = await blsService.sign(request.messageHash);
      signatures.push({
        nodeId: config.nodeId,
        signature,
        publicKey: blsService.getPublicKey()
      });
    } catch (error) {
      logger.error(`生成本节点签名失败: ${error instanceof Error ? error.message : String(error)}`);
    }

    return signatures;
  }

  /**
   * 聚合所有节点的签名
   */
  async aggregateSignatures(signatures: SignatureResponse[]): Promise<string> {
    try {
      const signatureStrings = signatures.map(sig => sig.signature);
      return await blsService.aggregateSignatures(signatureStrings);
    } catch (error) {
      logger.error(`聚合签名失败: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`聚合签名失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// 创建单例
export default new NodeService(); 