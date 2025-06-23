'use client';

import { useState } from 'react';
import { User, LoginFormData } from '@/lib/types';
import { userStorage } from '@/lib/storage';
import { verifyPasskeyCredential } from '@/lib/passkey';
import { Key, Mail } from 'lucide-react';

interface LoginFormProps {
  onLogin: (user: User) => void;
  onSwitchToRegister: () => void;
}

export default function LoginForm({ onLogin, onSwitchToRegister }: LoginFormProps) {
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const credential = await verifyPasskeyCredential();
      
      // 在实际应用中，这里应该发送到服务器验证
      // 这里我们简单地获取当前用户
      const currentUser = userStorage.getCurrentUser();
      if (!currentUser) {
        setError('未找到用户信息，请先注册');
        return;
      }

      onLogin(currentUser);
    } catch (error) {
      console.error('Passkey 登录失败:', error);
      setError('Passkey 登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailRecovery = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const user = userStorage.getUserByEmail(formData.email);
      if (!user) {
        setError('未找到该邮箱对应的账号');
        return;
      }

      // 在实际应用中，这里应该发送验证码到邮箱
      // 这里我们直接登录用户
      onLogin(user);
    } catch (error) {
      setError('账号恢复失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-6">登录</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <button
        onClick={handlePasskeyLogin}
        disabled={loading}
        className="btn-primary w-full flex items-center justify-center mb-6"
      >
        {loading ? (
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
        ) : (
          <>
            <Key className="h-5 w-5 mr-2" />
            使用 Passkey 登录
          </>
        )}
      </button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-300" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-white text-gray-500">或通过邮箱恢复账号</span>
        </div>
      </div>

      <form onSubmit={handleEmailRecovery} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            邮箱地址
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="input-field pl-10"
              placeholder="请输入邮箱地址"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-secondary w-full flex items-center justify-center"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-600"></div>
          ) : (
            <>
              <Mail className="h-5 w-5 mr-2" />
              通过邮箱恢复
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          还没有账号？{' '}
          <button
            onClick={onSwitchToRegister}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            立即注册
          </button>
        </p>
      </div>
    </div>
  );
} 