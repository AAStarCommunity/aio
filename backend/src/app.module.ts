import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import config from './config/config';
import { UserOperationController } from './controllers/UserOperationController';
import { UserOperationService } from './services/UserOperationService';
import { BundlerService } from './services/BundlerService';
import { PimlicoPaymasterService } from './services/pimlico.paymaster.service';
import { AuthController } from './controllers/auth.controller';
import { WalletController } from './controllers/wallet.controller';
import { UserService } from './services/user.service';
import { PasskeyService } from './services/passkey.service';
import { AAWalletService } from './services/aa-wallet.service';
import { UserSchema } from './models/user.model';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [config],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const mongoUri = configService.get<string>('mongoUri');
        console.log('尝试连接到 MongoDB:', mongoUri);
        
        const config = {
          uri: mongoUri,
          serverSelectionTimeoutMS: 30000,
          socketTimeoutMS: 45000,
          connectTimeoutMS: 30000,
          maxPoolSize: 10,
          heartbeatFrequencyMS: 2000,
        };
        console.log('MongoDB 详细配置:', JSON.stringify(config, null, 2));
        return config;
      },
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([{ name: 'User', schema: UserSchema }]),
  ],
  controllers: [UserOperationController, AuthController, WalletController],
  providers: [
    UserOperationService,
    BundlerService,
    PimlicoPaymasterService,
    UserService,
    PasskeyService,
    AAWalletService,
  ],
})
export class AppModule {} 