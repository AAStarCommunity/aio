import express from 'express';
import { BLSController } from '../controllers/BLSController';

const router = express.Router();
const blsController = new BLSController();

/**
 * @route POST /api/bls/sign
 * @desc 对消息进行签名
 * @access Public
 */
router.post('/sign', (req, res) => blsController.sign(req, res));

/**
 * @route POST /api/bls/verify
 * @desc 验证签名
 * @access Public
 */
router.post('/verify', (req, res) => blsController.verify(req, res));

/**
 * @route POST /api/bls/aggregate
 * @desc 聚合签名
 * @access Public
 */
router.post('/aggregate', (req, res) => blsController.aggregateSignatures(req, res));

/**
 * @route GET /api/bls/public-key
 * @desc 获取节点公钥
 * @access Public
 */
router.get('/public-key', (req, res) => blsController.getPublicKey(req, res));

export default router; 