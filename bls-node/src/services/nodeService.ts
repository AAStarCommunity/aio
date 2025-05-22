import { ethers } from 'ethers';
import config from '../config';
import logger from '../utils/logger';
import blsService from './blsService';
import { NodeInfo } from '../types';
import BLSNodeRegistryABI from '../abi/BLSNodeRegistry.json';

class NodeService {
  private nodes: Map<string, NodeInfo> = new Map();
  private isInitialized: boolean = false;
  private provider: ethers.JsonRpcProvider;
  private signer: ethers.Signer;
  private registryContract: ethers.Contract;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
    this.signer = new ethers.Wallet(config.ethereum.privateKey, this.provider);
    this.registryContract = new ethers.Contract(
      config.ethereum.blsNodeRegistryAddress,
      BLSNodeRegistryABI,
      this.signer
    );
  }

  /**
   * 初始化节点服务
   */
  async initialize() {
    if (this.isInitialized) return;

    try {
      // 注册本节点
      await this.registerWithContract();
      
      // 获取所有活跃节点
      await this.fetchNodesFromContract();

      logger.info('节点服务初始化成功');
      this.isInitialized = true;
    } catch (error) {
      logger.error(`节点服务初始化失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 向合约注册节点
   */
  private async registerWithContract() {
    try {
      // 检查节点是否已注册
      const isActive = await this.registryContract.isActiveNode(config.nodeId);
      if (isActive) {
        logger.info('节点已注册且处于活跃状态');
        return;
      }

      // 注册节点
      const tx = await this.registryContract.registerNode(
        config.nodeId,
        blsService.getPublicKey(),
        `http://localhost:${config.port}` // 注意：实际应用中应该使用真实的外部URL
      );

      await tx.wait();
      logger.info(`节点注册成功，交易哈希: ${tx.hash}`);
    } catch (error) {
      logger.error(`节点注册失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  /**
   * 从合约获取节点列表
   */
  private async fetchNodesFromContract() {
    try {
      const [activeNodeIds, publicKeys, urls] = await this.registryContract.getActiveNodes();
      
      // 清空现有节点列表
      this.nodes.clear();

      // 添加所有活跃节点
      for (let i = 0; i < activeNodeIds.length; i++) {
        this.addNode({
          nodeId: activeNodeIds[i],
          publicKey: publicKeys[i],
          url: urls[i]
        });
      }

      logger.info(`成功获取节点列表，共 ${this.nodes.size} 个活跃节点`);
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
  async removeNode(nodeId: string) {
    try {
      // 调用合约停用节点
      const tx = await this.registryContract.deactivateNode(nodeId);
      await tx.wait();
      
      // 从本地列表移除
      this.nodes.delete(nodeId);
      logger.info(`移除节点: ${nodeId}`);
    } catch (error) {
      logger.error(`移除节点失败: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
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
  async requestSignaturesFromNodes(request: { messageHash: string; userId: string }): Promise<Array<{
    nodeId: string;
    signature: string;
    publicKey: string;
  }>> {
    const signatures: Array<{
      nodeId: string;
      signature: string;
      publicKey: string;
    }> = [];

    // 获取最新的节点列表
    await this.fetchNodesFromContract();
    const nodes = this.getAllNodes();

    // 向所有活跃节点请求签名
    const signaturePromises = nodes
      .filter(node => node.nodeId !== config.nodeId) // 排除自己
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
    signatures.push(...results.filter((result): result is NonNullable<typeof result> => result !== null));

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
}

export default new NodeService(); 