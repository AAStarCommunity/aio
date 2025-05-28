import { create } from 'zustand';
import { AuthState, User } from '@/types';
import { startRegistration, startAuthentication } from '@simplewebauthn/browser';
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface AuthStore extends AuthState {
  register: (email: string) => Promise<void>;
  login: (email: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User | null) => void;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),

  register: async (email) => {
    try {
      set({ isLoading: true, error: null });

      // 1. 获取注册选项
      const { data: regOptions } = await axios.post(`${API_BASE_URL}/auth/register/start`, { email });

      // 2. 创建Passkey
      const attResp = await startRegistration(regOptions);

      // 3. 完成注册
      const { data: { user } } = await axios.post(`${API_BASE_URL}/auth/register/complete`, {
        email,
        attestation: attResp
      });

      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '注册失败',
        isLoading: false 
      });
    }
  },

  login: async (email) => {
    try {
      set({ isLoading: true, error: null });

      // 1. 获取登录选项
      const { data: authOptions } = await axios.post(`${API_BASE_URL}/auth/login/start`, { email });

      // 2. 使用Passkey验证
      const assertResp = await startAuthentication(authOptions);

      // 3. 完成登录
      const { data: { user } } = await axios.post(`${API_BASE_URL}/auth/login/complete`, {
        email,
        assertion: assertResp
      });

      set({ user, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '登录失败',
        isLoading: false 
      });
    }
  },

  logout: () => {
    set({ user: null, isAuthenticated: false });
  }
})); 