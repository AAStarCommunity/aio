import { Router } from 'express';
import signRoutes from './signRoutes';
import nodeRoutes from './nodeRoutes';
import passkeyRoutes from './passkeyRoutes';

const router = Router();

// 节点管理路由
router.use('/nodes', nodeRoutes);

// 签名路由
router.use('/sign', signRoutes);

// Passkey路由
router.use('/passkey', passkeyRoutes);

export default router; 