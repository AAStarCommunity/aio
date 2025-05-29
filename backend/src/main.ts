import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import config from './config/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 启用 CORS
  app.enableCors();
  
  const port = config.port || 3000;
  await app.listen(port);
  
  const logger = new Logger('Bootstrap');
  logger.log(`Server running on port ${port}`);
  logger.log(`Environment: ${config.nodeEnv}`);
  logger.log(`EntryPoint address: ${config.ethereum.entryPointAddress}`);
  logger.log(`AccountFactory address: ${config.ethereum.accountFactoryAddress}`);
  logger.log(`Paymaster address: ${config.ethereum.paymasterAddress}`);
  logger.log(`Active Bundler provider: ${config.bundler.activeProvider}`);
}

bootstrap(); 