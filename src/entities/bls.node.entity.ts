import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { BlsNodeStatus } from '../interfaces/bls.interface';

@Entity('bls_nodes')
export class BlsNodeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 98, unique: true }) // '0x' + 48 bytes hex
  publicKey: string;

  @Column({ type: 'varchar', length: 255 })
  endpoint: string;

  @Column({
    type: 'enum',
    enum: BlsNodeStatus,
    default: BlsNodeStatus.INACTIVE
  })
  status: BlsNodeStatus;

  @Column({ type: 'timestamp' })
  lastHeartbeat: Date;

  @CreateDateColumn()
  registeredAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'int', default: 0 })
  failedRequestCount: number;

  @Column({ type: 'int', default: 0 })
  successfulRequestCount: number;

  @Column({ type: 'float', default: 0 })
  averageResponseTime: number;
} 