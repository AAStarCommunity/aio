import { Router } from 'express';
import passkeyService from '../services/passkeyService';
import logger from '../utils/logger';

const router = Router();

/**
 * 生成Passkey注册选项
 */
router.post('/generate-registration-options', async (req, res) => {
  try {
    const { userId, email } = req.body;

    // 验证必要字段
    if (!userId || !email) {
      return res.status(400).json({ error: '缺少必要的用户信息' });
    }

    // 生成注册选项
    const options = await passkeyService.generateRegistrationOptions(userId, email);

    // 返回注册选项
    res.status(200).json(options);
  } catch (error) {
    logger.error(`生成Passkey注册选项失败: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: '生成Passkey注册选项失败' });
  }
});

/**
 * 验证Passkey注册
 */
router.post('/verify-registration', async (req, res) => {
  try {
    const { userId, email, response } = req.body;

    // 验证必要字段
    if (!userId || !email || !response) {
      return res.status(400).json({ error: '缺少必要的验证信息' });
    }

    // 验证注册
    const verification = await passkeyService.verifyRegistration(userId, email, response);

    // 返回验证结果
    if (verification.verified) {
      res.status(200).json({
        verified: true,
        credentialID: verification.credentialID
      });
    } else {
      res.status(400).json({
        verified: false,
        error: verification.error || '验证失败'
      });
    }
  } catch (error) {
    logger.error(`验证Passkey注册失败: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: '验证Passkey注册失败' });
  }
});

/**
 * 生成Passkey认证选项
 */
router.post('/generate-authentication-options', async (req, res) => {
  try {
    const { userId } = req.body;

    // 验证必要字段
    if (!userId) {
      return res.status(400).json({ error: '缺少必要的用户信息' });
    }

    // 生成认证选项
    const options = await passkeyService.generateAuthenticationOptions(userId);

    // 返回认证选项
    res.status(200).json(options);
  } catch (error) {
    logger.error(`生成Passkey认证选项失败: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: '生成Passkey认证选项失败' });
  }
});

/**
 * 验证Passkey认证
 */
router.post('/verify-authentication', async (req, res) => {
  try {
    const { userId, response } = req.body;

    // 验证必要字段
    if (!userId || !response) {
      return res.status(400).json({ error: '缺少必要的验证信息' });
    }

    // 验证认证
    const verification = await passkeyService.verifyAuthentication(userId, response);

    // 返回验证结果
    if (verification.verified) {
      res.status(200).json({ verified: true });
    } else {
      res.status(401).json({
        verified: false,
        error: verification.error || '验证失败'
      });
    }
  } catch (error) {
    logger.error(`验证Passkey认证失败: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: '验证Passkey认证失败' });
  }
});

/**
 * 验证UserOperation签名
 */
router.post('/verify-userop', async (req, res) => {
  try {
    const { userId, userOpHash, signature } = req.body;

    // 验证必要字段
    if (!userId || !userOpHash || !signature) {
      return res.status(400).json({ error: '缺少必要的验证信息' });
    }

    // 验证UserOperation签名
    const isValid = await passkeyService.verifyUserOpSignature(userId, userOpHash, signature);

    // 返回验证结果
    res.status(200).json({ isValid });
  } catch (error) {
    logger.error(`验证UserOperation签名失败: ${error instanceof Error ? error.message : String(error)}`);
    res.status(500).json({ error: '验证UserOperation签名失败' });
  }
});

export default router; 