import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import config from './config/config';
import { UserOperationController } from './controllers/UserOperationController';
import { UserOperationService } from './services/UserOperationService';
import { BundlerService } from './services/BundlerService';
import { PimlicoPaymasterService } from './services/pimlico.paymaster.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('mongoUri'),
        useNewUrlParser: true,
        useUnifiedTopology: true,
      }),
      inject: [ConfigService],
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