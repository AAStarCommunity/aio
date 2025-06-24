import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import config from './config/config';
import { UserOperationController } from './controllers/UserOperationController';
import { UserOperationService } from './services/UserOperationService';
import { BundlerService } from './services/BundlerService';
import { PimlicoPaymasterService } from './services/pimlico.paymaster.service';
import { AuthController } from './controllers/auth.controller';
import { UserService } from './services/user.service';
import { PasskeyService } from './services/passkey.service';

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
  controllers: [UserOperationController, AuthController],
  providers: [
    UserOperationService,
    BundlerService,
    PimlicoPaymasterService,
    UserService,
    PasskeyService,
  ],
})
export class AppModule {} 