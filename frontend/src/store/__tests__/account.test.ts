import { useAccountStore } from '../account';
import axios from 'axios';
import { ethers } from 'ethers';

// 模拟依赖
jest.mock('axios');
jest.mock('ethers');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AccountStore', () => {
  beforeEach(() => {
    // 重置store状态
    useAccountStore.setState({
      balance: '0',
      transactions: [],
      isLoading: false,
      error: null,
    });
    // 清除所有mock
    jest.clearAllMocks();
  });

  describe('fetchBalance', () => {
    const mockAddress = '0x1234';
    const mockBalance = '1000000000000000000'; // 1 ETH in wei

    it('应该成功获取余额', async () => {
      // 设置mock返回值
      mockedAxios.get.mockResolvedValueOnce({ data: { balance: mockBalance } });
      (ethers.formatEther as jest.Mock).mockReturnValueOnce('1.0');

      // 执行获取余额
      await useAccountStore.getState().fetchBalance(mockAddress);

      // 验证结果
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining(`/account/${mockAddress}/balance`));
      expect(ethers.formatEther).toHaveBeenCalledWith(mockBalance);
      expect(useAccountStore.getState().balance).toBe('1.0');
      expect(useAccountStore.getState().isLoading).toBe(false);
      expect(useAccountStore.getState().error).toBeNull();
    });

    it('应该处理获取余额失败', async () => {
      const error = new Error('获取余额失败');
      mockedAxios.get.mockRejectedValueOnce(error);

      // 执行获取余额
      await useAccountStore.getState().fetchBalance(mockAddress);

      // 验证结果
      expect(useAccountStore.getState().isLoading).toBe(false);
      expect(useAccountStore.getState().error).toBe('获取余额失败');
    });
  });

  describe('fetchTransactions', () => {
    const mockAddress = '0x1234';
    const mockTransactions = [
      {
        hash: '0xabc',
        from: '0x1234',
        to: '0x5678',
        value: '1.0',
        status: 'success',
        timestamp: new Date().toISOString(),
      },
    ];

    it('应该成功获取交易历史', async () => {
      // 设置mock返回值
      mockedAxios.get.mockResolvedValueOnce({ data: { transactions: mockTransactions } });

      // 执行获取交易历史
      await useAccountStore.getState().fetchTransactions(mockAddress);

      // 验证结果
      expect(mockedAxios.get).toHaveBeenCalledWith(expect.stringContaining(`/account/${mockAddress}/transactions`));
      expect(useAccountStore.getState().transactions).toEqual(mockTransactions);
      expect(useAccountStore.getState().isLoading).toBe(false);
      expect(useAccountStore.getState().error).toBeNull();
    });

    it('应该处理获取交易历史失败', async () => {
      const error = new Error('获取交易历史失败');
      mockedAxios.get.mockRejectedValueOnce(error);

      // 执行获取交易历史
      await useAccountStore.getState().fetchTransactions(mockAddress);

      // 验证结果
      expect(useAccountStore.getState().isLoading).toBe(false);
      expect(useAccountStore.getState().error).toBe('获取交易历史失败');
    });
  });

  describe('transfer', () => {
    const mockTransferData = {
      to: '0x5678',
      amount: '1.0',
      data: '0x',
    };
    const mockUserOp = {
      sender: '0x1234',
      nonce: '0x0',
      initCode: '0x',
      callData: '0x',
      callGasLimit: '0x0',
      verificationGasLimit: '0x0',
      preVerificationGas: '0x0',
      maxFeePerGas: '0x0',
      maxPriorityFeePerGas: '0x0',
      paymasterAndData: '0x',
      signature: '0x',
    };
    const mockTxHash = '0xabc';

    it('应该成功发起转账', async () => {
      // 设置mock返回值
      (ethers.parseEther as jest.Mock).mockReturnValueOnce('1000000000000000000');
      mockedAxios.post
        .mockResolvedValueOnce({ data: mockUserOp })
        .mockResolvedValueOnce({ data: { hash: mockTxHash } });

      // 执行转账
      await useAccountStore.getState().transfer(mockTransferData);

      // 验证结果
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(ethers.parseEther).toHaveBeenCalledWith(mockTransferData.amount);
      expect(useAccountStore.getState().transactions[0]).toMatchObject({
        hash: mockTxHash,
        from: mockUserOp.sender,
        to: mockTransferData.to,
        value: mockTransferData.amount,
        status: 'pending',
      });
      expect(useAccountStore.getState().isLoading).toBe(false);
      expect(useAccountStore.getState().error).toBeNull();
    });

    it('应该处理转账失败', async () => {
      const error = new Error('转账失败');
      (ethers.parseEther as jest.Mock).mockReturnValueOnce('1000000000000000000');
      mockedAxios.post.mockRejectedValueOnce(error);

      // 执行转账
      await useAccountStore.getState().transfer(mockTransferData);

      // 验证结果
      expect(useAccountStore.getState().isLoading).toBe(false);
      expect(useAccountStore.getState().error).toBe(error.message);
    });
  });
}); 