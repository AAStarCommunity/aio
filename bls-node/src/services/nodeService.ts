import { ethers } from 'ethers';
import config from '../config/config';
import logger from '../utils/logger';
import { BLSService } from './blsService';
import { NodeInfo } from '../types';
import BLSNodeRegistryABI from '../abi/BLSNodeRegistry.json';

export class NodeService {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer: ethers.Wallet;
  private readonly blsService: BLSService;
  private readonly registryContract: ethers.Contract;
  private nodes: Map<string, NodeInfo> = new Map();
  private isInitialized: boolean = false;

  constructor(
    provider: ethers.JsonRpcProvider,
    signer: ethers.Wallet,
    registryAddress: string
  ) {
    this.provider = provider;
    this.signer = signer;
    this.blsService = new BLSService(Buffer.from(config.bls.privateKey, 'hex'));
    this.registryContract = new ethers.Contract(
      registryAddress,
      BLSNodeRegistryABI,
      this.signer
    );
  }

  /**
   * 初始化节点服务
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // 获取所有活跃节点
      const activeNodes = await this.registryContract.getActiveNodes();
      const { nodeIds, publicKeys, urls } = activeNodes;

      // 更新节点列表
      for (let i = 0; i < nodeIds.length; i++) {
        this.nodes.set(nodeIds[i], {
          nodeId: nodeIds[i],
          publicKey: publicKeys[i],
          url: urls[i]
        });
      }

      this.isInitialized = true;
      logger.info('Node service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize node service:', error);
      throw error;
    }
  }

  /**
   * 向合约注册节点
   */
  public async registerNode(): Promise<string> {
    try {
      // 获取节点信息
      const nodeId = config.nodeId;
      const publicKey = this.blsService.getPublicKey();
      const url = config.node.url;

      // 验证参数
      if (!nodeId) {
        throw new Error('Node ID is required');
      }
      if (!url) {
        throw new Error('Node URL is required');
      }
      if (!publicKey || publicKey.length !== 48) {
        throw new Error('Invalid BLS public key (must be 48 bytes)');
      }

      // 检查是否已注册
      const node = await this.registryContract.getNode(nodeId);
      if (node.registeredAt !== 0n) {
        throw new Error(`Node ${nodeId} is already registered`);
      }

      // 注册节点
      logger.info(`Registering node ${nodeId} with URL ${url}`);
      const tx = await this.registryContract.registerNode(nodeId, publicKey, url);
      const receipt = await tx.wait();
      
      // 添加到本地节点列表
      this.addNode({
        nodeId,
        publicKey,
        url
      });

      logger.info(`Node registered successfully. Transaction hash: ${receipt.hash}`);
      return receipt.hash;
    } catch (error) {
      logger.error('Failed to register node:', error);
      throw error;
    }
  }

  /**
   * 向其他节点请求签名
   */
  public async requestSignaturesFromNodes(request: {
    messageHash: string;
    userId: string;
  }): Promise<Array<{
    nodeId: string;
    signature?: string;
    publicKey: string;
  }>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const signatures: Array<{
      nodeId: string;
      signature?: string;
      publicKey: string;
    }> = [];

    // 获取所有节点的签名
    const nodes = Array.from(this.nodes.values());

    // 并行请求所有节点的签名
    const signaturePromises = nodes.map(async node => {
      try {
        const response = await fetch(`${node.url}/api/bls/sign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request)
        });

        if (!response.ok) {
          throw new Error(`Failed to get signature from node ${node.nodeId}`);
        }

        const data = await response.json() as { signature: string };
        return {
          nodeId: node.nodeId,
          signature: data.signature,
          publicKey: node.publicKey
        };
      } catch (error) {
        logger.error(`Error getting signature from node ${node.nodeId}:`, error);
        return {
          nodeId: node.nodeId,
          signature: undefined,
          publicKey: node.publicKey
        };
      }
    });

    const results = await Promise.all(signaturePromises);
    signatures.push(...results);

    return signatures;
  }

  /**
   * 添加节点
   */
  public addNode(node: NodeInfo): void {
    this.nodes.set(node.nodeId, node);
  }

  /**
   * 获取节点信息（从本地缓存）
   */
  public getNode(nodeId: string): NodeInfo | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * 从合约获取节点信息
   */
  public async getNodeFromContract(nodeId: string): Promise<{
    publicKey: string;
    url: string;
    registeredAt: bigint;
    active: boolean;
  }> {
    try {
      const node = await this.registryContract.getNode(nodeId);
      return node;
    } catch (error) {
      logger.error(`Failed to get node from contract: ${error}`);
      throw error;
    }
  }

  /**
   * 获取所有节点
   */
  public getAllNodes(): NodeInfo[] {
    return Array.from(this.nodes.values());
  }

  public async getNodeStatus(): Promise<boolean> {
    try {
      const publicKey = this.blsService.getPublicKey();
      const isRegistered = await this.registryContract.isNodeRegistered(publicKey);
      
      logger.info(`Node registration status: ${isRegistered}`);
      return isRegistered;
    } catch (error) {
      logger.error(`Error checking node status: ${error}`);
      throw error;
    }
  }

  public async removeNode(nodeId: string): Promise<void> {
    try {
      // 调用合约停用节点
      const tx = await this.registryContract.deactivateNode(nodeId);
      await tx.wait();
      
      // 从本地列表移除
      this.nodes.delete(nodeId);
      logger.info(`Node removed: ${nodeId}`);
    } catch (error) {
      logger.error(`Failed to remove node: ${error}`);
      throw error;
    }
  }
}

// 创建默认实例
const defaultNodeService = new NodeService(
  new ethers.JsonRpcProvider(config.ethereum.rpcUrl),
  new ethers.Wallet(config.ethereum.privateKey, new ethers.JsonRpcProvider(config.ethereum.rpcUrl)),
  config.ethereum.blsNodeRegistryAddress
);

export default defaultNodeService; 