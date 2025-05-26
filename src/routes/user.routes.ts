import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import {
  registerValidation,
  registerCompleteValidation,
  loginValidation,
  loginCompleteValidation,
} from '../middlewares/validator.middleware';

const router = Router();
const userController = new UserController();

/**
 * @swagger
 * /users/register/start:
 *   post:
 *     summary: 开始注册流程
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: 返回注册选项
 *       400:
 *         description: 邮箱已注册或格式错误
 */
router.post('/register/start', registerValidation, userController.startRegistration);

/**
 * @swagger
 * /users/register/complete:
 *   post:
 *     summary: 完成注册流程
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - response
 *               - aaAddress
 *             properties:
 *               response:
 *                 type: object
 *               aaAddress:
 *                 type: string
 *                 pattern: ^0x[a-fA-F0-9]{40}$
 *     responses:
 *       200:
 *         description: 注册成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       400:
 *         description: 验证失败或参数错误
 */
router.post('/register/complete', registerCompleteValidation, userController.completeRegistration);

/**
 * @swagger
 * /users/login/start:
 *   post:
 *     summary: 开始登录流程
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: 返回登录选项
 *       404:
 *         description: 用户不存在
 */
router.post('/login/start', loginValidation, userController.startLogin);

/**
 * @swagger
 * /users/login/complete:
 *   post:
 *     summary: 完成登录流程
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - response
 *             properties:
 *               response:
 *                 type: object
 *     responses:
 *       200:
 *         description: 登录成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 user:
 *                   $ref: '#/components/schemas/User'
 *       401:
 *         description: 验证失败
 */
router.post('/login/complete', loginCompleteValidation, userController.completeLogin);

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: 获取用户信息
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: 返回用户信息
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       401:
 *         description: 未登录
 */
router.get('/profile', userController.getUserInfo);

export default router; 