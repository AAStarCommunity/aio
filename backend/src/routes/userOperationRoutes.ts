import { Router } from 'express';
import { UserOperationController } from '../controllers/UserOperationController';
import { UserOperationService } from '../services/UserOperationService';
import { BundlerService } from '../services/BundlerService';

const router = Router();

// 创建服务实例
const bundlerService = new BundlerService();
const userOperationService = new UserOperationService(bundlerService);
const userOpController = new UserOperationController(userOperationService);

/**
 * @route POST /api/userop/create
 * @desc 创建用户操作
 * @access Public
 */
router.post('/create', (req, res) => userOpController.createUserOperation(req, res));

/**
 * @route POST /api/userop/send
 * @desc 发送用户操作
 * @access Public
 */
router.post('/send', async (req, res) => {
  try {
    const result = await userOpController.sendUserOperation(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route GET /api/userop/status/:userOpHash
 * @desc 获取用户操作状态
 * @access Public
 */
router.get('/status/:hash', async (req, res) => {
  try {
    const result = await userOpController.getUserOperationStatus(req.params.hash);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @route POST /api/userop/estimate-gas
 * @desc 估算交易gas费用
 * @access Public
 */
router.post('/estimate', (req, res) => userOpController.estimateTransactionGas(req, res));

export default router; 