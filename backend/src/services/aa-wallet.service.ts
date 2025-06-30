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

      // 确保 BLS 公钥是 48 字节（96 个十六进制字符 + 0x）
      const blsKeyBytes = ethers.getBytes(blsPublicKey);
      if (blsKeyBytes.length !== 48) {
        throw new Error('BLS public key must be 48 bytes');
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

      // 确保 BLS 公钥是 48 字节
      const blsKeyBytes = ethers.getBytes(blsPublicKey);
      if (blsKeyBytes.length !== 48) {
        throw new Error('BLS public key must be 48 bytes');
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
      const tx = await this.factoryContract.getFunction('createAccount')(
        ownerAddress,
        blsPublicKey,
        salt
      );

      logger.info(`Wallet creation transaction sent: ${tx.hash}`);

      // 等待交易确认
      const receipt = await tx.wait();
      logger.info(`Wallet creation transaction confirmed: ${receipt.transactionHash}`);

      // 从事件中获取创建的钱包地址
      const accountCreatedEvent = receipt.logs.find(
        (log: any) => log.topics[0] === ethers.id("AccountCreated(address,address,bytes)")
      );

      let actualAddress = expectedAddress;
      if (accountCreatedEvent) {
        // 从事件主题中提取地址
        const addressFromEvent = '0x' + accountCreatedEvent.topics[1].slice(26);
        actualAddress = ethers.getAddress(addressFromEvent);
      }

      // 验证钱包是否成功创建
      const finalCode = await this.provider.getCode(actualAddress);
      if (finalCode === '0x') {
        throw new Error('Wallet creation failed: no contract code at expected address');
      }

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