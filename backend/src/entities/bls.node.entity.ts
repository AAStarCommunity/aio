import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { BlsNodeStatus } from '../interfaces/bls.interface';

@Entity('bls_nodes')
export class BlsNodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 98 }) // 0x + 96 hex chars
  publicKey: string;

  @Column({ type: 'varchar', length: 255 })
  endpoint: string;

  @Column({
    type: 'enum',
    enum: BlsNodeStatus,
    default: BlsNodeStatus.ACTIVE,
  })
  status: BlsNodeStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastHeartbeat: Date;

  @Column({ type: 'int', default: 0 })
  successfulRequestCount: number;

  @Column({ type: 'int', default: 0 })
  failedRequestCount: number;

  @Column({ type: 'float', default: 0 })
  averageResponseTime: number;

  @CreateDateColumn()
  registeredAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
} 