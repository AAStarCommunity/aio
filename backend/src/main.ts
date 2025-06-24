import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import configuration from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // 启用 CORS 并配置详细选项
  app.enableCors({
    origin: ['http://localhost:8080', 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });
  
  const port = configuration.port || 3001;
  await app.listen(port);
  
  const logger = new Logger('Bootstrap');
  logger.log(`Server running on port ${port}`);
  logger.log(`Environment: ${configuration.nodeEnv}`);
  logger.log(`RPC URL: ${configuration.ethereum.rpcUrl}`);
  logger.log(`Chain ID: ${configuration.ethereum.chainId}`);
  logger.log(`EntryPoint address: ${configuration.ethereum.entryPointAddress}`);
  logger.log(`AccountFactory address: ${configuration.ethereum.accountFactoryAddress}`);
  logger.log(`Paymaster address: ${configuration.ethereum.paymasterAddress}`);
  logger.log(`Bundler URL: ${configuration.bundler.url}`);
}

bootstrap(); 