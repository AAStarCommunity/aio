import { Router } from 'express';
import nodeService from '../services/nodeService';
import logger from '../utils/logger';
import config from '../config';

const router = Router();

/**
 * 获取所有节点列表
 */
router.get('/', (req, res) => {
  try {
    const nodes = nodeService.getAllNodes();
    res.status(200).json(nodes);
  } catch (error) {
    logger.error(`获取节点列表失败: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: '获取节点列表失败' });
  }
});

/**
 * 注册新节点
 */
router.post('/register', (req, res) => {
  try {
    // 只有主节点可以接受节点注册
    if (!config.isMasterNode) {
      return res.status(403).json({ error: '只有主节点可以接受节点注册' });
    }

    const { nodeId, publicKey, url } = req.body;

    // 验证必要字段
    if (!nodeId || !publicKey || !url) {
      return res.status(400).json({ error: '缺少必要的节点信息' });
    }

    // 添加节点
    nodeService.addNode({ nodeId, publicKey, url });

    // 返回成功响应
    res.status(201).json({ 
      message: '节点注册成功', 
      nodeId, 
      totalNodes: nodeService.getAllNodes().length 
    });
  } catch (error) {
    logger.error(`节点注册失败: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: '节点注册失败' });
  }
});

/**
 * 移除节点
 */
router.delete('/:nodeId', (req, res) => {
  try {
    // 只有主节点可以移除节点
    if (!config.isMasterNode) {
      return res.status(403).json({ error: '只有主节点可以移除节点' });
    }

    const { nodeId } = req.params;

    // 移除节点
    nodeService.removeNode(nodeId);

    // 返回成功响应
    res.status(200).json({ 
      message: '节点移除成功', 
      nodeId, 
      totalNodes: nodeService.getAllNodes().length 
    });
  } catch (error) {
    logger.error(`节点移除失败: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: '节点移除失败' });
  }
});

export default router; 