import { Router } from 'express';
import blsService from '../services/blsService';
import nodeService from '../services/nodeService';
import passkeyService from '../services/passkeyService';
import logger from '../utils/logger';
import config from '../config';

const router = Router();

/**
 * 处理单节点签名请求
 */
router.post('/', async (req, res) => {
  try {
    const { messageHash, userId } = req.body;

    // 验证必要字段
    if (!messageHash) {
      return res.status(400).json({ error: '缺少必要的签名信息' });
    }

    // 如果提供了userId，需验证Passkey签名
    if (userId) {
      const isPasskeyValid = await passkeyService.verifyUserOpSignature(userId, messageHash, '');
      if (!isPasskeyValid) {
        return res.status(401).json({ error: 'Passkey签名验证失败' });
      }
    }

    // 使用BLS私钥进行签名
    const signature = await blsService.sign(messageHash);

    // 返回签名结果
    res.status(200).json({
      nodeId: config.nodeId,
      signature,
      publicKey: blsService.getPublicKey()
    });
  } catch (error) {
    logger.error(`签名请求处理失败: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: '签名请求处理失败' });
  }
});

/**
 * 处理聚合签名请求（主节点功能）
 */
router.post('/aggregate', async (req, res) => {
  try {
    // 只有主节点可以执行聚合签名
    if (!config.isMasterNode) {
      return res.status(403).json({ error: '只有主节点可以执行聚合签名' });
    }

    const { messageHash, userId } = req.body;

    // 验证必要字段
    if (!messageHash || !userId) {
      return res.status(400).json({ error: '缺少必要的签名信息' });
    }

    // 向所有节点请求签名
    const signatures = await nodeService.requestSignaturesFromNodes({ messageHash, userId });

    // 如果没有获取到足够的签名（至少一个）
    if (signatures.length === 0) {
      return res.status(400).json({ error: '没有足够的签名' });
    }

    // 聚合签名
    const aggregatedSignature = await blsService.aggregateSignatures(
      signatures.map(sig => sig.signature)
    );

    // 验证聚合签名
    const isValid = await blsService.verifyAggregatedSignature(
      messageHash,
      aggregatedSignature,
      signatures.map(sig => sig.publicKey)
    );

    // 返回聚合签名结果
    res.status(200).json({
      aggregatedSignature,
      isValid,
      signatures: signatures.map(sig => ({
        nodeId: sig.nodeId,
        publicKey: sig.publicKey
      })),
      totalSignatures: signatures.length
    });
  } catch (error) {
    logger.error(`聚合签名请求处理失败: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: '聚合签名请求处理失败' });
  }
});

/**
 * 验证聚合签名
 */
router.post('/verify', async (req, res) => {
  try {
    const { messageHash, aggregatedSignature, publicKeys } = req.body;

    // 验证必要字段
    if (!messageHash || !aggregatedSignature || !publicKeys || !Array.isArray(publicKeys)) {
      return res.status(400).json({ error: '缺少必要的验证信息' });
    }

    // 验证聚合签名
    const isValid = await blsService.verifyAggregatedSignature(
      messageHash,
      aggregatedSignature,
      publicKeys
    );

    // 返回验证结果
    res.status(200).json({ isValid });
  } catch (error) {
    logger.error(`签名验证请求处理失败: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: '签名验证请求处理失败' });
  }
});

export default router; 