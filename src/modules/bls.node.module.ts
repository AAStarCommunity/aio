import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BlsNodeController } from '../controllers/bls.node.controller';
import { BlsNodeService } from '../services/bls.node.service';
import { BlsNodeEntity } from '../entities/bls.node.entity';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forFeature([BlsNodeEntity]),
    ConfigModule,
  ],
  controllers: [BlsNodeController],
  providers: [BlsNodeService],
  exports: [BlsNodeService],
})
export class BlsNodeModule {} 