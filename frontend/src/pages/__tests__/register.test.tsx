import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Register from '../register';
import { useAuthStore } from '@/store/auth';
import { toast } from 'react-hot-toast';

// 模拟依赖
jest.mock('react-hot-toast');
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
}));

describe('Register', () => {
  const mockRegister = jest.fn();

  beforeEach(() => {
    // 重置store状态和mock
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      register: mockRegister,
    });
    jest.clearAllMocks();
  });

  it('应该渲染注册表单', () => {
    render(<Register />);

    // 验证标题
    expect(screen.getByText('创建新账户')).toBeInTheDocument();

    // 验证表单元素
    expect(screen.getByLabelText('邮箱地址')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '注册' })).toBeInTheDocument();

    // 验证登录链接
    expect(screen.getByText('立即登录')).toBeInTheDocument();
  });

  it('应该处理成功注册', async () => {
    mockRegister.mockResolvedValueOnce(undefined);

    render(<Register />);

    // 输入邮箱
    const emailInput = screen.getByLabelText('邮箱地址');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

    // 提交表单
    const submitButton = screen.getByRole('button', { name: '注册' });
    fireEvent.click(submitButton);

    // 验证注册函数调用
    expect(mockRegister).toHaveBeenCalledWith('test@example.com');

    // 验证成功提示
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith('注册成功！');
    });
  });

  it('应该显示加载状态', () => {
    // 设置加载状态
    useAuthStore.setState({
      isLoading: true,
    });

    render(<Register />);

    // 验证按钮文本和禁用状态
    const submitButton = screen.getByRole('button', { name: '注册中...' });
    expect(submitButton).toBeDisabled();
  });

  it('应该显示错误信息', () => {
    // 设置错误状态
    useAuthStore.setState({
      error: '注册失败：邮箱已存在',
    });

    render(<Register />);

    // 验证错误信息显示
    expect(screen.getByText('注册失败：邮箱已存在')).toBeInTheDocument();
  });

  it('应该验证必填字段', () => {
    render(<Register />);

    // 提交空表单
    const submitButton = screen.getByRole('button', { name: '注册' });
    fireEvent.click(submitButton);

    // 验证注册函数未被调用
    expect(mockRegister).not.toHaveBeenCalled();
  });
}); 