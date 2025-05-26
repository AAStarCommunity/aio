import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import { AppError } from './error.middleware';

// 验证结果处理中间件
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const messages = errors.array().map(error => error.msg);
    throw new AppError(400, messages.join(', '));
  }
  next();
};

// 注册参数验证规则
export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  validate,
];

// 注册完成参数验证规则
export const registerCompleteValidation = [
  body('response').notEmpty().withMessage('缺少验证响应'),
  body('aaAddress')
    .notEmpty()
    .withMessage('缺少AA账户地址')
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage('无效的以太坊地址格式'),
  validate,
];

// 登录参数验证规则
export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  validate,
];

// 登录完成参数验证规则
export const loginCompleteValidation = [
  body('response').notEmpty().withMessage('缺少验证响应'),
  validate,
]; 