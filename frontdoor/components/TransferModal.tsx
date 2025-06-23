'use client';

import { useState } from 'react';
import { User, Contact, Transfer, TransferFormData } from '@/lib/types';
import { transferStorage, generateId, formatAddress } from '@/lib/storage';
import { DollarSign, User as UserIcon, X, Send } from 'lucide-react';

interface TransferModalProps {
  fromUser: User;
  toContact: Contact;
  onTransfer: (transfer: Transfer) => void;
  onClose: () => void;
}

export default function TransferModal({ fromUser, toContact, onTransfer, onClose }: TransferModalProps) {
  const [formData, setFormData] = useState<TransferFormData>({
    toAddress: toContact.walletAddress,
    amount: 0,
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.amount || formData.amount <= 0) {
      setError('请输入有效的转账金额');
      setLoading(false);
      return;
    }

    try {
      // 在实际应用中，这里应该调用钱包进行签名和发送交易
      // 这里我们模拟一个交易哈希
      const txHash = `0x${Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')}`;

      const transfer: Transfer = {
        id: generateId(),
        fromAddress: fromUser.walletAddress,
        toAddress: formData.toAddress,
        amount: formData.amount,
        status: 'completed', // 演示中直接设为完成
        description: formData.description || undefined,
        createdAt: new Date().toISOString(),
        txHash
      };

      transferStorage.saveTransfer(transfer);
      onTransfer(transfer);
    } catch (error) {
      setError('转账失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">转账给联系人</h3>
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

          {/* 收款人信息 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">收款人</h4>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                <UserIcon className="h-4 w-4 text-primary-600" />
              </div>
              <div>
                <p className="font-medium text-gray-900">{toContact.name}</p>
                <p className="text-sm text-gray-500 font-mono">
                  {formatAddress(toContact.walletAddress)}
                </p>
              </div>
            </div>
          </div>

          {/* 转账金额 */}
          <div>
            <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
              转账金额 (ETH) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="number"
                id="amount"
                name="amount"
                value={formData.amount}
                onChange={handleInputChange}
                className="input-field pl-10"
                placeholder="0.00"
                min="0.00001"
                step="0.00001"
                required
              />
            </div>
          </div>

          {/* 转账说明 */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              转账说明
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="input-field resize-none"
              rows={3}
              placeholder="请输入转账说明（可选）"
            />
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
                <>
                  <Send className="h-4 w-4 mr-2" />
                  确认转账
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 