import { Controller, Post, Body, Logger } from '@nestjs/common';
import { UserService } from '../services/user.service';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly userService: UserService) {}

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
      aaAddress: string;
    },
  ) {
    this.logger.log(`完成注册流程，邮箱: ${body.email}`);
    try {
      const user = await this.userService.completeRegistration(
        body.email,
        body.response,
        body.challenge,
        body.aaAddress,
      );
      this.logger.log(`注册完成成功`);
      return { user };
    } catch (error) {
      this.logger.error(`注册完成失败: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('login/start')
  async startLogin(@Body() body: { email: string }) {
    this.logger.log(`开始登录流程，邮箱: ${body.email}`);
    try {
      const options = await this.userService.startLogin(body.email);
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
      email: string;
      response: any;
      challenge: string;
    },
  ) {
    this.logger.log(`完成登录流程，邮箱: ${body.email}`);
    try {
      const user = await this.userService.completeLogin(
        body.email,
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