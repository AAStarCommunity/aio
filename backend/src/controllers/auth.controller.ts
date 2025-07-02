import { Controller, Post, Body, Logger, Get, Param } from '@nestjs/common';
import { UserService } from '../services/user.service';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly userService: UserService) {}

  @Get('email/check/:email')
  async checkEmailExists(@Param('email') email: string) {
    this.logger.log(`检查邮箱是否存在: ${email}`);
    try {
      const exists = await this.userService.checkEmailExists(email);
      this.logger.log(`邮箱检查结果: ${exists ? '存在' : '不存在'}`);
      return { exists };
    } catch (error) {
      this.logger.error(`邮箱检查失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('user/email/:email')
  async getUserByEmail(@Param('email') email: string) {
    this.logger.log(`根据邮箱获取用户信息: ${email}`);
    try {
      const user = await this.userService.getUserByEmail(email);
      this.logger.log(`用户查询结果: ${user ? '找到' : '未找到'}`);
      if (!user) {
        return { user: null };
      }
      return { 
        user: {
          email: user.email,
          aaAddress: user.aaAddress,
          createdAt: (user as any).createdAt || new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error(`用户查询失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('register/start')
  async startRegistration(@Body() body: { email: string }) {
    this.logger.log(`开始注册流程，邮箱: ${body.email}`);
    try {
      const options = await this.userService.startRegistration(body.email);
      this.logger.log(`成功生成注册选项`);
      return { options };
    } catch (error) {
      this.logger.error(`注册开始失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('register/complete')
  async completeRegistration(
    @Body()
    body: {
      email: string;
      response: RegistrationResponseJSON;
      challenge: string;
    },
  ) {
    this.logger.log(`完成注册流程，邮箱: ${body.email}`);
    try {
      const user = await this.userService.completeRegistration(
        body.email,
        body.response,
        body.challenge,
      );
      this.logger.log(`注册完成成功，AA钱包地址: ${user.aaAddress}`);
      return { user };
    } catch (error) {
      this.logger.error(`注册完成失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('login/start')
  async startLogin(@Body() body: { email: string }) {
    this.logger.log(`开始登录流程，邮箱: ${body.email || '(空)'}`);
    try {
      const options = await this.userService.startLogin(body.email || '');
      this.logger.log(`成功生成登录选项`);
      return { options };
    } catch (error) {
      this.logger.error(`登录开始失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('login/complete')
  async completeLogin(
    @Body()
    body: {
      credentialId: string;
      response: any;
      challenge: string;
    },
  ) {
    this.logger.log(`完成登录流程，接收到的参数:`);
    this.logger.log(`- credentialId: ${body.credentialId}`);
    this.logger.log(`- challenge: ${body.challenge}`);
    this.logger.log(`- response.id: ${body.response?.id}`);
    
    try {
      const user = await this.userService.completeLogin(
        body.credentialId,
        body.response,
        body.challenge,
      );
      this.logger.log(`登录完成成功`);
      return { user };
    } catch (error) {
      this.logger.error(`登录完成失败: ${error.message}`, error.stack);
      throw error;
    }
  }
} 