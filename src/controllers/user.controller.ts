import { Request, Response, NextFunction } from 'express';
import { UserService } from '../services/user.service';
import { AppError } from '../middlewares/error.middleware';

export class UserController {
  private userService: UserService;

  constructor() {
    this.userService = new UserService();
  }

  // 开始注册
  startRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      if (!email) {
        throw new AppError(400, '邮箱不能为空');
      }

      const options = await this.userService.startRegistration(email);
      
      // 保存challenge到session
      req.session.challenge = options.challenge;
      req.session.email = email;

      res.json(options);
    } catch (error) {
      next(error);
    }
  };

  // 完成注册
  completeRegistration = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { response, aaAddress } = req.body;
      const challenge = req.session.challenge;
      const email = req.session.email;

      if (!challenge || !email) {
        throw new AppError(400, '注册会话已过期');
      }

      if (!response || !aaAddress) {
        throw new AppError(400, '缺少必要参数');
      }

      const user = await this.userService.completeRegistration(
        email,
        response,
        challenge,
        aaAddress
      );

      // 清除session
      delete req.session.challenge;
      delete req.session.email;

      res.json({
        message: '注册成功',
        user: {
          email: user.email,
          aaAddress: user.aaAddress,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 开始登录
  startLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email } = req.body;
      if (!email) {
        throw new AppError(400, '邮箱不能为空');
      }

      const options = await this.userService.startLogin(email);

      // 保存challenge到session
      req.session.challenge = options.challenge;
      req.session.email = email;

      res.json(options);
    } catch (error) {
      next(error);
    }
  };

  // 完成登录
  completeLogin = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { response } = req.body;
      const challenge = req.session.challenge;
      const email = req.session.email;

      if (!challenge || !email) {
        throw new AppError(400, '登录会话已过期');
      }

      if (!response) {
        throw new AppError(400, '缺少必要参数');
      }

      const user = await this.userService.completeLogin(
        email,
        response,
        challenge
      );

      // 清除challenge
      delete req.session.challenge;

      res.json({
        message: '登录成功',
        user: {
          email: user.email,
          aaAddress: user.aaAddress,
        },
      });
    } catch (error) {
      next(error);
    }
  };

  // 获取用户信息
  getUserInfo = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const email = req.session.email;
      if (!email) {
        throw new AppError(401, '未登录');
      }

      const user = await this.userService.getUserByEmail(email);

      res.json({
        email: user.email,
        aaAddress: user.aaAddress,
      });
    } catch (error) {
      next(error);
    }
  };
} 