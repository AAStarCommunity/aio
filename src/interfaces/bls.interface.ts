import { BigNumberish } from 'ethers';

export interface BlsNode {
  id: string;
  publicKey: string;
  endpoint: string;
  status: BlsNodeStatus;
  lastHeartbeat: Date;
  registeredAt: Date;
}

export enum BlsNodeStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export interface BlsSignature {
  signature: string;
  publicKey: string;
  timestamp: Date;
}

export interface BlsRegistrationRequest {
  publicKey: string;
  endpoint: string;
}

export interface BlsHeartbeatRequest {
  nodeId: string;
  timestamp: Date;
  signature: string; // 节点使用其私钥对 timestamp 进行签名
}

export interface BlsSignRequest {
  userOpHash: string;
  deadline: BigNumberish;
}

export interface BlsSignResponse {
  signature: string;
  timestamp: Date;
} 