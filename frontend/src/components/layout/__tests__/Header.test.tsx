import { render, screen, fireEvent } from '@testing-library/react';
import Header from '../Header';
import { useAuthStore } from '@/store/auth';

// 模拟next/router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
  }),
}));

describe('Header', () => {
  beforeEach(() => {
    // 重置store状态
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
  });

  it('应该渲染未登录状态的导航栏', () => {
    render(<Header />);

    // 验证Logo
    expect(screen.getByText('AAStar')).toBeInTheDocument();

    // 验证导航链接
    expect(screen.getByText('首页')).toBeInTheDocument();
    expect(screen.getByText('转账')).toBeInTheDocument();
    expect(screen.getByText('交易历史')).toBeInTheDocument();

    // 验证登录/注册按钮
    expect(screen.getByText('登录')).toBeInTheDocument();
    expect(screen.getByText('注册')).toBeInTheDocument();
  });

  it('应该渲染已登录状态的导航栏', () => {
    // 设置登录状态
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

    render(<Header />);

    // 验证用户头像
    expect(screen.getByText('T')).toBeInTheDocument();

    // 点击用户头像显示下拉菜单
    fireEvent.click(screen.getByText('T'));

    // 验证退出登录按钮
    expect(screen.getByText('退出登录')).toBeInTheDocument();
  });

  it('应该正确处理退出登录', () => {
    // 设置登录状态
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

    render(<Header />);

    // 点击用户头像显示下拉菜单
    fireEvent.click(screen.getByText('T'));

    // 点击退出登录
    fireEvent.click(screen.getByText('退出登录'));

    // 验证状态已重置
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
}); 