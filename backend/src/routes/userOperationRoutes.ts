import express from 'express';
import { UserOperationController } from '../controllers/UserOperationController';

const router = express.Router();
const userOpController = new UserOperationController();

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
router.post('/send', (req, res) => userOpController.sendUserOperation(req, res));

/**
 * @route GET /api/userop/status/:userOpHash
 * @desc 获取用户操作状态
 * @access Public
 */
router.get('/status/:userOpHash', (req, res) => userOpController.getUserOperationStatus(req, res));

/**
 * @route POST /api/userop/estimate-gas
 * @desc 估算交易gas费用
 * @access Public
 */
router.post('/estimate-gas', (req, res) => userOpController.estimateTransactionGas(req, res));

export default router; 