import { Controller, Post, Body } from '@nestjs/common';
import { UserService } from '../services/user.service';
import type { RegistrationResponseJSON } from '@simplewebauthn/types';

@Controller('auth')
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @Post('register/start')
  async startRegistration(@Body() body: { email: string }) {
    const options = await this.userService.startRegistration(body.email);
    return { options };
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
    const user = await this.userService.completeRegistration(
      body.email,
      body.response,
      body.challenge,
      body.aaAddress,
    );
    return { user };
  }

  @Post('login/start')
  async startLogin(@Body() body: { email: string }) {
    const options = await this.userService.startLogin(body.email);
    return { options };
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
    const user = await this.userService.completeLogin(
      body.email,
      body.response,
      body.challenge,
    );
    return { user };
  }
} 