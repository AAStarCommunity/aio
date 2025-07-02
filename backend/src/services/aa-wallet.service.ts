import { Injectable } from '@nestjs/common';
import { ethers } from 'ethers';
import { ConfigService } from '@nestjs/config';
import logger from '../utils/logger';

// AAAccountFactory 合约 ABI
const AAAccountFactoryABI = [
  "function createAccount(address owner, bytes calldata blsPublicKey, bytes32 salt) public returns (address)",
  "function getAddress(address owner, bytes calldata blsPublicKey, bytes32 salt) public view returns (address)",
  "event AccountCreated(address indexed account, address indexed owner, bytes blsPublicKey)"
];

export interface CreateWalletRequest {
  ownerAddress: string;
  blsPublicKey: string;
  salt?: string;
}

export interface WalletInfo {
  address: string;
  ownerAddress: string;
  blsPublicKey: string;
  salt: string;
  transactionHash?: string;
}

@Injectable()
export class AAWalletService {
  private readonly provider: ethers.JsonRpcProvider;
  private readonly signer: ethers.Wallet;
  private readonly factoryContract: ethers.Contract;
  private readonly factoryAddress: string;

  constructor(private readonly configService: ConfigService) {
    // 初始化 provider 和 signer
    const rpcUrl = this.configService.get<string>('ethereum.rpcUrl');
    const privateKey = this.configService.get<string>('ethereum.privateKey');
    this.factoryAddress = this.configService.get<string>('ethereum.accountFactoryAddress');

    if (!rpcUrl || !privateKey || !this.factoryAddress) {
      throw new Error('Missing required Ethereum configuration');
    }

    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.factoryContract = new ethers.Contract(
      this.factoryAddress,
      AAAccountFactoryABI,
      this.signer
    );

    logger.info(`AAWalletService initialized with factory at ${this.factoryAddress}`);
  }

  /**
   * 计算钱包地址（不创建）
   * @param request 钱包创建请求
   * @returns 预计算的钱包地址
   */
  async getWalletAddress(request: CreateWalletRequest): Promise<string> {
    try {
      const { ownerAddress, blsPublicKey, salt = '0x0000000000000000000000000000000000000000000000000000000000000000' } = request;

      // 验证输入参数
      if (!ethers.isAddress(ownerAddress)) {
        throw new Error('Invalid owner address');
      }

      if (!blsPublicKey || !blsPublicKey.startsWith('0x')) {
        throw new Error('Invalid BLS public key format');
      }

      // 验证 BLS 公钥长度（通常是48字节，但可能包含额外的元数据）
      const blsKeyBytes = ethers.getBytes(blsPublicKey);
      if (blsKeyBytes.length < 48) {
        throw new Error(`BLS public key too short: ${blsKeyBytes.length} bytes, expected at least 48 bytes`);
      }
      
      // 记录实际的BLS公钥信息用于调试
      logger.info(`BLS public key length: ${blsKeyBytes.length} bytes`);
      if (blsKeyBytes.length !== 48) {
        logger.warn(`BLS public key is ${blsKeyBytes.length} bytes instead of expected 48 bytes`);
      }

      // 调用合约的 getAddress 方法
      const walletAddress = await this.factoryContract.getFunction('getAddress')(
        ownerAddress,
        blsPublicKey,
        salt
      );

      logger.info(`Calculated wallet address: ${walletAddress} for owner: ${ownerAddress}`);
      return walletAddress;
    } catch (error) {
      logger.error('Error calculating wallet address:', error);
      throw new Error(`Failed to calculate wallet address: ${error.message}`);
    }
  }

  /**
   * 创建新的 AA 钱包
   * @param request 钱包创建请求
   * @returns 创建的钱包信息
   */
  async createWallet(request: CreateWalletRequest): Promise<WalletInfo> {
    try {
      const { ownerAddress, blsPublicKey, salt = '0x0000000000000000000000000000000000000000000000000000000000000000' } = request;

      // 验证输入参数
      if (!ethers.isAddress(ownerAddress)) {
        throw new Error('Invalid owner address');
      }

      if (!blsPublicKey || !blsPublicKey.startsWith('0x')) {
        throw new Error('Invalid BLS public key format');
      }

      // 验证 BLS 公钥长度（通常是48字节，但可能包含额外的元数据）
      const blsKeyBytes = ethers.getBytes(blsPublicKey);
      if (blsKeyBytes.length < 48) {
        throw new Error(`BLS public key too short: ${blsKeyBytes.length} bytes, expected at least 48 bytes`);
      }
      
      // 记录实际的BLS公钥信息用于调试
      logger.info(`BLS public key length: ${blsKeyBytes.length} bytes`);
      if (blsKeyBytes.length !== 48) {
        logger.warn(`BLS public key is ${blsKeyBytes.length} bytes instead of expected 48 bytes`);
      }

      // 首先计算预期的钱包地址
      const expectedAddress = await this.getWalletAddress(request);

      // 检查钱包是否已经存在
      const code = await this.provider.getCode(expectedAddress);
      if (code !== '0x') {
        logger.info(`Wallet already exists at address: ${expectedAddress}`);
        return {
          address: expectedAddress,
          ownerAddress,
          blsPublicKey,
          salt,
        };
      }

      // 创建钱包
      logger.info(`Creating wallet for owner: ${ownerAddress}`);
      const tx = await this.factoryContract.createAccount(
        ownerAddress,
        blsPublicKey,
        salt
      );

      logger.info(`Wallet creation transaction sent: ${tx.hash}`);

      // 等待交易确认
      let receipt;
      try {
        receipt = await tx.wait();
        if (!receipt) {
          // 如果 wait() 返回 undefined，手动获取交易收据
          logger.info(`tx.wait() returned undefined, fetching receipt manually for ${tx.hash}`);
          await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
          receipt = await this.provider.getTransactionReceipt(tx.hash);
        }
        logger.info(`Wallet creation transaction confirmed: ${receipt?.transactionHash || tx.hash}`);
      } catch (error) {
        logger.error(`Error waiting for transaction: ${error.message}`);
        // 手动获取交易收据作为备选方案
        receipt = await this.provider.getTransactionReceipt(tx.hash);
      }

      if (!receipt) {
        throw new Error('Failed to get transaction receipt');
      }

      // 从事件中获取创建的钱包地址
      logger.info(`Looking for AccountCreated event in ${receipt.logs.length} logs`);
      const accountCreatedEvent = receipt.logs.find(
        (log: any) => log.topics[0] === ethers.id("AccountCreated(address,address,bytes)")
      );

      let actualAddress = expectedAddress;
      logger.info(`Expected address: ${expectedAddress}`);
      
      if (accountCreatedEvent) {
        // 从事件主题中提取地址
        const addressFromEvent = '0x' + accountCreatedEvent.topics[1].slice(26);
        actualAddress = ethers.getAddress(addressFromEvent);
        logger.info(`Found AccountCreated event, extracted address: ${addressFromEvent} -> normalized: ${actualAddress}`);
      } else {
        logger.warn('No AccountCreated event found, using expected address');
        // 让我们打印所有日志主题来调试
        receipt.logs.forEach((log: any, index: number) => {
          logger.info(`Log ${index}: topic[0] = ${log.topics[0]}, address = ${log.address}`);
        });
      }

      // 验证钱包是否成功创建（带重试机制，因为可能存在时间延迟）
      logger.info(`Checking contract code at address: ${actualAddress}`);
      let finalCode = '0x';
      let retryCount = 0;
      const maxRetries = 5;
      
      while (finalCode === '0x' && retryCount < maxRetries) {
        if (retryCount > 0) {
          logger.info(`Retry ${retryCount}/${maxRetries}: Waiting for contract deployment...`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // 等待1秒
        }
        
        finalCode = await this.provider.getCode(actualAddress);
        logger.info(`Attempt ${retryCount + 1}: Contract code length: ${finalCode.length}, has code: ${finalCode !== '0x'}`);
        retryCount++;
      }
      
      if (finalCode === '0x') {
        logger.error(`No contract code found at address after ${maxRetries} attempts: ${actualAddress}`);
        logger.error(`Expected address: ${expectedAddress}`);
        logger.error(`Transaction hash: ${tx.hash}`);
        
        // 尝试检查预期地址的代码
        const expectedCode = await this.provider.getCode(expectedAddress);
        logger.error(`Expected address code length: ${expectedCode.length}, has code: ${expectedCode !== '0x'}`);
        
        throw new Error('Wallet creation failed: no contract code at expected address');
      }
      
      logger.info(`Contract deployment verified successfully after ${retryCount} attempts`);

      const walletInfo: WalletInfo = {
        address: actualAddress,
        ownerAddress,
        blsPublicKey,
        salt,
        transactionHash: receipt.transactionHash,
      };

      logger.info(`Wallet created successfully: ${JSON.stringify(walletInfo)}`);
      return walletInfo;
    } catch (error) {
      logger.error('Error creating wallet:', error);
      throw new Error(`Failed to create wallet: ${error.message}`);
    }
  }

  /**
   * 检查钱包是否存在
   * @param address 钱包地址
   * @returns 是否存在
   */
  async isWalletExists(address: string): Promise<boolean> {
    try {
      if (!ethers.isAddress(address)) {
        return false;
      }

      const code = await this.provider.getCode(address);
      return code !== '0x';
    } catch (error) {
      logger.error('Error checking wallet existence:', error);
      return false;
    }
  }

  /**
   * 获取钱包信息
   * @param address 钱包地址
   * @returns 钱包信息
   */
  async getWalletInfo(address: string): Promise<any> {
    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid wallet address');
      }

      const exists = await this.isWalletExists(address);
      if (!exists) {
        throw new Error('Wallet does not exist');
      }

      // 创建钱包合约实例来获取信息
      const walletABI = [
        "function owner() external view returns (address)",
        "function blsPublicKey() external view returns (bytes)",
        "function isTesting() external view returns (bool)"
      ];

      const walletContract = new ethers.Contract(address, walletABI, this.provider);

      const [owner, blsPublicKey, isTesting] = await Promise.all([
        walletContract.owner(),
        walletContract.blsPublicKey(),
        walletContract.isTesting()
      ]);

      return {
        address,
        owner,
        blsPublicKey: ethers.hexlify(blsPublicKey),
        isTesting,
      };
    } catch (error) {
      logger.error('Error getting wallet info:', error);
      throw new Error(`Failed to get wallet info: ${error.message}`);
    }
  }

  /**
   * 生成随机 salt
   * @returns 随机 salt
   */
  generateRandomSalt(): string {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  /**
   * 从用户邮箱和 BLS 公钥生成确定性 salt
   * @param email 用户邮箱
   * @param blsPublicKey BLS 公钥
   * @returns 确定性 salt
   */
  generateDeterministicSalt(email: string, blsPublicKey: string): string {
    const data = ethers.solidityPacked(['string', 'bytes'], [email, blsPublicKey]);
    return ethers.keccak256(data);
  }
} 