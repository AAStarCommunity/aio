import { ethers } from 'ethers';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import config from '../config/config';
import logger from '../utils/logger';
import { BundlerServiceFactory, IBundlerService, UserOperationRequest } from './BundlerService';

/**
 * 表示要执行的交易请求
 */
export interface TransactionRequest {
  to: string;
  value: string;
  data: string;
  operation?: number; // 0 for CALL, 1 for DELEGATECALL
}

/**
 * 用户操作服务
 */
export class UserOperationService {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly bundlerService: IBundlerService;
  private readonly entryPointAddress: string;
  private readonly factoryAddress: string;
  private readonly paymasterAddress: string;
  private readonly chainId: number;

  constructor() {
    this.entryPointAddress = config.ethereum.entryPointAddress;
    this.factoryAddress = config.ethereum.accountFactoryAddress;
    this.paymasterAddress = config.ethereum.paymasterAddress;
    this.chainId = config.ethereum.chainId;
    this.provider = new ethers.JsonRpcProvider(config.ethereum.rpcUrl);
    this.bundlerService = BundlerServiceFactory.createBundlerService();
  }

  /**
   * 创建用户操作
   * @param accountAddress 账户地址
   * @param txRequest 交易请求
   * @param paymasterEnabled 是否启用Paymaster
   * @returns 未签名的用户操作
   */
  async createUserOperation(
    accountAddress: string,
    txRequest: TransactionRequest,
    paymasterEnabled: boolean = false
  ): Promise<UserOperationRequest> {
    try {
      logger.info(`Creating user operation for account: ${accountAddress}`);
      
      // 获取当前nonce
      const nonce = await this.getAccountNonce(accountAddress);
      
      // 构造callData (execute方法的调用)
      const callData = this.encodeExecuteCall(txRequest);
      
      // 初始估算gas值
      const callGasLimit = '100000';
      const verificationGasLimit = '100000';
      const preVerificationGas = '50000';
      
      // 获取当前gas价格
      const gasPrice = await this.provider.getFeeData();
      const maxFeePerGas = (gasPrice.maxFeePerGas || gasPrice.gasPrice || ethers.parseUnits('10', 'gwei')).toString();
      const maxPriorityFeePerGas = (gasPrice.maxPriorityFeePerGas || ethers.parseUnits('1', 'gwei')).toString();
      
      // 初始用户操作
      const userOp: UserOperationRequest = {
        sender: accountAddress,
        nonce: nonce,
        initCode: '0x', // 已经部署的账户不需要initCode
        callData: callData,
        callGasLimit: callGasLimit,
        verificationGasLimit: verificationGasLimit,
        preVerificationGas: preVerificationGas,
        maxFeePerGas: maxFeePerGas,
        maxPriorityFeePerGas: maxPriorityFeePerGas,
        paymasterAndData: '0x', // 默认不使用paymaster
        signature: '0x' // 暂时为空，后续会添加签名
      };
      
      // 如果需要Paymaster，设置paymasterAndData
      if (paymasterEnabled && this.paymasterAddress !== '0x0000000000000000000000000000000000000000') {
        userOp.paymasterAndData = this.paymasterAddress;
      }
      
      // 估算gas费用
      const gasEstimation = await this.bundlerService.estimateUserOperationGas(userOp);
      userOp.callGasLimit = gasEstimation.callGasLimit;
      userOp.verificationGasLimit = gasEstimation.verificationGasLimit;
      userOp.preVerificationGas = gasEstimation.preVerificationGas;
      
      logger.info(`User operation created: ${JSON.stringify(userOp)}`);
      return userOp;
    } catch (error) {
      logger.error(`Error creating user operation: ${error}`);
      throw new Error(`Failed to create user operation: ${error}`);
    }
  }

  /**
   * 获取账户nonce
   * @param accountAddress 账户地址
   * @returns nonce
   */
  private async getAccountNonce(accountAddress: string): Promise<string> {
    try {
      // 创建RPC客户端
      const client = createPublicClient({
        chain: sepolia,
        transport: http(config.ethereum.rpcUrl),
      });
      
      // 调用EntryPoint合约的getNonce方法
      const data = {
        address: this.entryPointAddress as `0x${string}`,
        abi: [
          {
            inputs: [
              { name: 'sender', type: 'address' },
              { name: 'key', type: 'uint192' }
            ],
            name: 'getNonce',
            outputs: [{ name: '', type: 'uint256' }],
            stateMutability: 'view',
            type: 'function'
          }
        ],
        functionName: 'getNonce',
        args: [accountAddress as `0x${string}`, BigInt(0)]
      };
      
      const nonce = await client.readContract(data);
      return nonce.toString();
    } catch (error) {
      logger.error(`Error getting account nonce: ${error}`);
      // 如果获取失败，默认返回0
      return '0';
    }
  }

  /**
   * 编码execute调用
   * @param txRequest 交易请求
   * @returns 编码后的callData
   */
  private encodeExecuteCall(txRequest: TransactionRequest): string {
    // execute(address,uint256,bytes)
    const abiCoder = new ethers.AbiCoder();
    const executeSelector = '0xb61d27f6';
    
    const encodedCallData = abiCoder.encode(
      ['address', 'uint256', 'bytes'],
      [txRequest.to, txRequest.value, txRequest.data]
    );
    
    return executeSelector + encodedCallData.slice(2); // 去掉0x前缀
  }

  /**
   * 发送用户操作
   * @param userOp 签名后的用户操作
   * @returns 用户操作哈希
   */
  async sendUserOperation(userOp: UserOperationRequest): Promise<string> {
    try {
      logger.info(`Sending user operation: ${JSON.stringify(userOp)}`);
      
      // 确保用户操作已经签名
      if (!userOp.signature || userOp.signature === '0x') {
        throw new Error('User operation must be signed before sending');
      }
      
      // 发送用户操作
      const userOpHash = await this.bundlerService.sendUserOperation(userOp);
      
      logger.info(`User operation sent, hash: ${userOpHash}`);
      return userOpHash;
    } catch (error) {
      logger.error(`Error sending user operation: ${error}`);
      throw new Error(`Failed to send user operation: ${error}`);
    }
  }

  /**
   * 获取用户操作状态
   * @param userOpHash 用户操作哈希
   * @returns 用户操作状态
   */
  async getUserOperationStatus(userOpHash: string): Promise<any> {
    try {
      logger.info(`Getting user operation status, hash: ${userOpHash}`);
      
      const status = await this.bundlerService.getUserOperationStatus(userOpHash);
      
      logger.info(`User operation status: ${JSON.stringify(status)}`);
      return status;
    } catch (error) {
      logger.error(`Error getting user operation status: ${error}`);
      throw new Error(`Failed to get user operation status: ${error}`);
    }
  }

  /**
   * 预估交易gas费用
   * @param accountAddress 账户地址
   * @param txRequest 交易请求
   * @param paymasterEnabled 是否启用Paymaster
   * @returns gas费用估算
   */
  async estimateTransactionGas(
    accountAddress: string,
    txRequest: TransactionRequest,
    paymasterEnabled: boolean = false
  ): Promise<any> {
    try {
      logger.info(`Estimating transaction gas for account: ${accountAddress}`);
      
      // 创建未签名的用户操作
      const userOp = await this.createUserOperation(accountAddress, txRequest, paymasterEnabled);
      
      // 估算gas费用
      const gasEstimation = await this.bundlerService.estimateUserOperationGas(userOp);
      
      // 计算总gas费用
      const totalGas = BigInt(gasEstimation.callGasLimit) + 
                       BigInt(gasEstimation.verificationGasLimit) + 
                       BigInt(gasEstimation.preVerificationGas);
      
      const totalGasCostWei = totalGas * BigInt(userOp.maxFeePerGas);
      const totalGasCostEth = ethers.formatEther(totalGasCostWei.toString());
      
      const result = {
        callGasLimit: gasEstimation.callGasLimit,
        verificationGasLimit: gasEstimation.verificationGasLimit,
        preVerificationGas: gasEstimation.preVerificationGas,
        totalGas: totalGas.toString(),
        maxFeePerGas: userOp.maxFeePerGas,
        totalGasCostWei: totalGasCostWei.toString(),
        totalGasCostEth
      };
      
      logger.info(`Gas estimation result: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      logger.error(`Error estimating transaction gas: ${error}`);
      throw new Error(`Failed to estimate transaction gas: ${error}`);
    }
  }
} 