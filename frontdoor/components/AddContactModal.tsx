'use client';

import { useState } from 'react';
import { Contact } from '@/lib/types';
import { generateId } from '@/lib/storage';
import { isValidEthereumAddress } from '@/lib/demo-data';
import { User, X } from 'lucide-react';

interface AddContactModalProps {
  userId: string;
  onAdd: (contact: Contact) => void;
  onClose: () => void;
}

export default function AddContactModal({ userId, onAdd, onClose }: AddContactModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    walletAddress: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // 验证钱包地址格式
      if (!isValidEthereumAddress(formData.walletAddress)) {
        setError('请输入有效的以太坊钱包地址');
        return;
      }

      const newContact: Contact = {
        id: generateId(),
        userId,
        name: formData.name,
        walletAddress: formData.walletAddress,
        createdAt: new Date().toISOString(),
      };

      onAdd(newContact);
    } catch (error) {
      setError('添加联系人失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">添加联系人</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            title="关闭"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              备注名 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input-field pl-10"
                placeholder="请输入联系人备注名"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="walletAddress" className="block text-sm font-medium text-gray-700 mb-1">
              钱包地址 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="walletAddress"
              name="walletAddress"
              value={formData.walletAddress}
              onChange={handleInputChange}
              className="input-field font-mono"
              placeholder="0x..."
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              请输入有效的以太坊钱包地址（以 0x 开头的 42 位十六进制字符）
            </p>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mx-auto"></div>
              ) : (
                '添加联系人'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 