/**
 * BLS节点配置接口
 */
export interface NodeConfig {
  port: number;
  nodeEnv: string;
  nodeId: string;
  logLevel: string;
  ethereum: {
    rpcUrl: string;
    chainId: number;
    blsNodeRegistryAddress: string;
    privateKey: string;
  };
  bls: {
    privateKey: string;
    publicKey: string;
  };
}

/**
 * 节点信息接口
 */
export interface NodeInfo {
  nodeId: string;
  publicKey: string;
  url: string;
}

/**
 * 签名请求接口
 */
export interface SignatureRequest {
  messageHash: string;
}

/**
 * 签名响应接口
 */
export interface SignatureResponse {
  nodeId: string;
  signature: string;
  publicKey: string;
}

/**
 * 聚合签名结果接口
 */
export interface AggregatedSignatureResult {
  aggregatedSignature: string;
  isValid: boolean;
  signatures: {
    nodeId: string;
    publicKey: string;
  }[];
  totalSignatures: number;
}

/**
 * 用户验证器接口
 */
export interface UserVerifier {
  userId: string;
  email: string;
  credentialID: string;
  credentialPublicKey: string;
  counter: number;
}