'use client';

import { useState } from 'react';
import { User, RegisterFormData } from '@/lib/types';
import { userStorage } from '@/lib/storage';
import { createPasskeyCredential } from '@/lib/passkey';
import { generateId } from '@/lib/storage';
import { UserPlus, Mail, User as UserIcon } from 'lucide-react';

interface RegisterFormProps {
  onRegister: (user: User) => void;
  onSwitchToLogin: () => void;
}

export default function RegisterForm({ onRegister, onSwitchToLogin }: RegisterFormProps) {
  const [formData, setFormData] = useState<RegisterFormData>({
    email: '',
    name: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 检查邮箱是否已注册
      const existingUser = userStorage.getUserByEmail(formData.email);
      if (existingUser) {
        setError('该邮箱已被注册');
        return;
      }

      // 创建 Passkey 凭证
      const credential = await createPasskeyCredential(formData.email, formData.name);
      
      // 生成钱包地址（这里使用演示地址，实际项目中应该通过 Web3 库生成）
      const walletAddress = `0x${Array.from(crypto.getRandomValues(new Uint8Array(20)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;

      // 创建新用户
      const newUser: User = {
        id: generateId(),
        email: formData.email,
        name: formData.name,
        walletAddress,
        hasPasskey: true
      };

      // 保存用户信息
      userStorage.saveUser(newUser);
      
      setSuccess('注册成功！');
      setTimeout(() => {
        onRegister(newUser);
      }, 1500);
    } catch (error) {
      console.error('注册失败:', error);
      setError('注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-center mb-6">注册</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded-lg">
          {success}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            姓名
          </label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="input-field pl-10"
              placeholder="请输入姓名"
              required
            />
          </div>
        </div>

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
          <p className="text-xs text-gray-500 mt-1">
            邮箱将用于账号恢复和跨设备登录
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <UserPlus className="h-5 w-5 mr-2" />
              注册并创建 Passkey
            </>
          )}
        </button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          已有账号？{' '}
          <button
            onClick={onSwitchToLogin}
            className="text-primary-600 hover:text-primary-700 font-medium"
          >
            立即登录
          </button>
        </p>
      </div>
    </div>
  );
} 