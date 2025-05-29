import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import config from './config/config';
import { UserOperationController } from './controllers/UserOperationController';
import { UserOperationService } from './services/UserOperationService';
import { BundlerService } from './services/BundlerService';
import { PimlicoPaymasterService } from './services/pimlico.paymaster.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [() => config],
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: config.database.host,
      port: config.database.port,
      username: config.database.username,
      password: config.database.password,
      database: config.database.name,
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      synchronize: config.nodeEnv === 'development',
    }),
  ],
  controllers: [UserOperationController],
  providers: [
    UserOperationService,
    BundlerService,
    PimlicoPaymasterService,
  ],
})
export class AppModule {} 