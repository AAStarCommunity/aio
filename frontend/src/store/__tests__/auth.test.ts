import { useAuthStore } from '../auth';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import axios from 'axios';

// 模拟依赖
jest.mock('@simplewebauthn/browser', () => ({
  startRegistration: jest.fn(),
  startAuthentication: jest.fn(),
}));

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('AuthStore', () => {
  beforeEach(() => {
    // 重置store状态
    useAuthStore.setState({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    });
    // 清除所有mock
    jest.clearAllMocks();
  });

  describe('register', () => {
    const mockEmail = 'test@example.com';
    const mockRegOptions = { challenge: 'test-challenge' };
    const mockAttResp = { id: 'test-id' };
    const mockUser = {
      email: mockEmail,
      aaAddress: '0x1234',
      createdAt: new Date().toISOString(),
    };

    it('应该成功注册用户', async () => {
      // 设置mock返回值
      mockedAxios.post
        .mockResolvedValueOnce({ data: mockRegOptions })
        .mockResolvedValueOnce({ data: { user: mockUser } });
      (startRegistration as jest.Mock).mockResolvedValueOnce(mockAttResp);

      // 执行注册
      await useAuthStore.getState().register(mockEmail);

      // 验证结果
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(startRegistration).toHaveBeenCalledWith(mockRegOptions);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('应该处理注册失败', async () => {
      const error = new Error('注册失败');
      mockedAxios.post.mockRejectedValueOnce(error);

      // 执行注册
      await useAuthStore.getState().register(mockEmail);

      // 验证结果
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().error).toBe('注册失败');
    });
  });

  describe('login', () => {
    const mockEmail = 'test@example.com';
    const mockAuthOptions = { challenge: 'test-challenge' };
    const mockAssertResp = { id: 'test-id' };
    const mockUser = {
      email: mockEmail,
      aaAddress: '0x1234',
      createdAt: new Date().toISOString(),
    };

    it('应该成功登录用户', async () => {
      // 设置mock返回值
      mockedAxios.post
        .mockResolvedValueOnce({ data: mockAuthOptions })
        .mockResolvedValueOnce({ data: { user: mockUser } });
      (startAuthentication as jest.Mock).mockResolvedValueOnce(mockAssertResp);

      // 执行登录
      await useAuthStore.getState().login(mockEmail);

      // 验证结果
      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
      expect(startAuthentication).toHaveBeenCalledWith(mockAuthOptions);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().error).toBeNull();
    });

    it('应该处理登录失败', async () => {
      const error = new Error('登录失败');
      mockedAxios.post.mockRejectedValueOnce(error);

      // 执行登录
      await useAuthStore.getState().login(mockEmail);

      // 验证结果
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().error).toBe('登录失败');
    });
  });

  describe('logout', () => {
    it('应该成功登出用户', () => {
      // 设置初始状态
      useAuthStore.setState({
        user: { email: 'test@example.com', aaAddress: '0x1234', createdAt: new Date().toISOString() },
        isAuthenticated: true,
        isLoading: false,
        error: null,
      });

      // 执行登出
      useAuthStore.getState().logout();

      // 验证结果
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });
}); 