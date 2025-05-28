import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Transfer from '../transfer';
import { useAuthStore } from '@/store/auth';
import { useAccountStore } from '@/store/account';
import { toast } from 'react-hot-toast';
import { ethers } from 'ethers';

// 模拟依赖
jest.mock('react-hot-toast');
jest.mock('ethers');
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('Transfer', () => {
  const mockTransfer = jest.fn();
  const mockFetchBalance = jest.fn();

  beforeEach(() => {
    // 重置store状态
    useAuthStore.setState({
      user: {
        email: 'test@example.com',
        aaAddress: '0x1234',
        createdAt: new Date().toISOString(),
      },
      isAuthenticated: true,
      isLoading: false,
      error: null,
    });

    useAccountStore.setState({
      balance: '1.0',
      transactions: [],
      isLoading: false,
      error: null,
      transfer: mockTransfer,
      fetchBalance: mockFetchBalance,
    });

    jest.clearAllMocks();
  });

  it('应该渲染转账表单', () => {
    render(<Transfer />);

    // 验证余额显示
    expect(screen.getByText('1.0 ETH')).toBeInTheDocument();

    // 验证表单元素
    expect(screen.getByLabelText('接收地址')).toBeInTheDocument();
    expect(screen.getByLabelText(/转账金额/)).toBeInTheDocument();
    expect(screen.getByLabelText(/附加数据/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确认转账' })).toBeInTheDocument();
  });

  it('应该验证地址格式', async () => {
    (ethers.isAddress as jest.Mock).mockReturnValue(false);

    render(<Transfer />);

    // 输入无效地址
    const addressInput = screen.getByLabelText('接收地址');
    fireEvent.change(addressInput, { target: { value: 'invalid-address' } });

    // 输入金额
    const amountInput = screen.getByLabelText(/转账金额/);
    fireEvent.change(amountInput, { target: { value: '0.1' } });

    // 提交表单
    const form = screen.getByRole('form');
    await act(async () => {
      fireEvent.submit(form);
    });

    // 验证错误提示
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('请输入有效的以太坊地址');
    });
    expect(mockTransfer).not.toHaveBeenCalled();
  });

  it('应该验证金额格式', async () => {
    (ethers.isAddress as jest.Mock).mockReturnValue(true);

    render(<Transfer />);

    // 输入有效地址
    const addressInput = screen.getByLabelText('接收地址');
    fireEvent.change(addressInput, { target: { value: '0x5678' } });

    // 输入无效金额
    const amountInput = screen.getByLabelText(/转账金额/);
    fireEvent.change(amountInput, { target: { value: '-1' } });

    // 提交表单
    const form = screen.getByRole('form');
    await act(async () => {
      fireEvent.submit(form);
    });

    // 验证错误提示
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('请输入有效的金额');
    });
    expect(mockTransfer).not.toHaveBeenCalled();
  });

  it('应该验证余额充足', async () => {
    (ethers.isAddress as jest.Mock).mockReturnValue(true);

    render(<Transfer />);

    // 输入有效地址
    const addressInput = screen.getByLabelText('接收地址');
    fireEvent.change(addressInput, { target: { value: '0x5678' } });

    // 输入超过余额的金额
    const amountInput = screen.getByLabelText(/转账金额/);
    fireEvent.change(amountInput, { target: { value: '2.0' } });

    // 提交表单
    const form = screen.getByRole('form');
    await act(async () => {
      fireEvent.submit(form);
    });

    // 验证错误提示
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('余额不足');
    });
    expect(mockTransfer).not.toHaveBeenCalled();
  });

  it('应该成功发起转账', async () => {
    (ethers.isAddress as jest.Mock).mockReturnValue(true);
    mockTransfer.mockResolvedValueOnce(undefined);

    render(<Transfer />);

    // 输入有效地址
    const addressInput = screen.getByLabelText('接收地址');
    fireEvent.change(addressInput, { target: { value: '0x5678' } });

    // 输入有效金额
    const amountInput = screen.getByLabelText(/转账金额/);
    fireEvent.change(amountInput, { target: { value: '0.1' } });

    // 提交表单
    const form = screen.getByRole('form');
    await act(async () => {
      fireEvent.submit(form);
    });

    // 验证转账函数调用
    await waitFor(() => {
      expect(mockTransfer).toHaveBeenCalledWith({
        to: '0x5678',
        amount: '0.1',
        data: '',
      });
    });

    // 验证成功提示
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('转账请求已提交');
    });
  });

  it('应该显示加载状态', () => {
    // 设置加载状态
    useAccountStore.setState({
      isLoading: true,
    });

    render(<Transfer />);

    // 验证按钮文本和禁用状态
    const submitButton = screen.getByRole('button', { name: '处理中...' });
    expect(submitButton).toBeDisabled();
  });

  it('应该显示错误信息', () => {
    // 设置错误状态
    useAccountStore.setState({
      error: '转账失败：Gas费用不足',
    });

    render(<Transfer />);

    // 验证错误信息显示
    expect(screen.getByText('转账失败：Gas费用不足')).toBeInTheDocument();
  });
}); 