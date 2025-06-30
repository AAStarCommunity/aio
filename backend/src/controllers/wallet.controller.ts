import { Controller, Post, Get, Body, Param, Logger } from '@nestjs/common';
import { AAWalletService, CreateWalletRequest } from '../services/aa-wallet.service';

@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private readonly aaWalletService: AAWalletService) {}

  @Post('create')
  async createWallet(@Body() request: CreateWalletRequest) {
    this.logger.log(`Creating wallet for owner: ${request.ownerAddress}`);
    try {
      const walletInfo = await this.aaWalletService.createWallet(request);
      this.logger.log(`Wallet created successfully: ${walletInfo.address}`);
      return { success: true, walletInfo };
    } catch (error) {
      this.logger.error(`Failed to create wallet: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('address')
  async getWalletAddress(@Body() request: CreateWalletRequest) {
    this.logger.log(`Calculating wallet address for owner: ${request.ownerAddress}`);
    try {
      const address = await this.aaWalletService.getWalletAddress(request);
      this.logger.log(`Calculated wallet address: ${address}`);
      return { success: true, address };
    } catch (error) {
      this.logger.error(`Failed to calculate wallet address: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('info/:address')
  async getWalletInfo(@Param('address') address: string) {
    this.logger.log(`Getting wallet info for address: ${address}`);
    try {
      const info = await this.aaWalletService.getWalletInfo(address);
      this.logger.log(`Retrieved wallet info for: ${address}`);
      return { success: true, info };
    } catch (error) {
      this.logger.error(`Failed to get wallet info: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Get('exists/:address')
  async checkWalletExists(@Param('address') address: string) {
    this.logger.log(`Checking if wallet exists: ${address}`);
    try {
      const exists = await this.aaWalletService.isWalletExists(address);
      this.logger.log(`Wallet ${address} exists: ${exists}`);
      return { success: true, exists };
    } catch (error) {
      this.logger.error(`Failed to check wallet existence: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post('salt/random')
  generateRandomSalt() {
    const salt = this.aaWalletService.generateRandomSalt();
    this.logger.log(`Generated random salt: ${salt}`);
    return { success: true, salt };
  }

  @Post('salt/deterministic')
  generateDeterministicSalt(@Body() body: { email: string; blsPublicKey: string }) {
    const salt = this.aaWalletService.generateDeterministicSalt(body.email, body.blsPublicKey);
    this.logger.log(`Generated deterministic salt for ${body.email}: ${salt}`);
    return { success: true, salt };
  }
} 