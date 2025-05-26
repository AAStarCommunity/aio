import { Router } from 'express';
import blsRoutes from './blsRoutes';
import nodeRoutes from './nodeRoutes';

const router = Router();

// 节点管理路由
router.use('/node', nodeRoutes);

// BLS路由
router.use('/bls', blsRoutes);

export default router; 