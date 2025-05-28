import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/auth';
import { useAccountStore } from '@/store/account';
import Layout from '@/components/layout/Layout';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';

export default function Transfer() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { balance, transfer, isLoading, error, fetchBalance } = useAccountStore();

  const [formData, setFormData] = useState({
    to: '',
    amount: '',
    data: ''
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.aaAddress) {
      fetchBalance(user.aaAddress);
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 验证地址格式
    if (!ethers.isAddress(formData.to)) {
      toast.error('请输入有效的以太坊地址');
      return;
    }

    // 验证金额
    try {
      const amount = parseFloat(formData.amount);
      if (isNaN(amount) || amount <= 0) {
        toast.error('请输入有效的金额');
        return;
      }

      const balanceNum = parseFloat(balance);
      if (amount > balanceNum) {
        toast.error('余额不足');
        return;
      }
    } catch (err) {
      toast.error('请输入有效的金额');
      return;
    }

    try {
      await transfer(formData);
      toast.success('转账请求已提交');
      router.push('/');
    } catch (err) {
      // 错误已经在store中处理
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          {/* 余额卡片 */}
          <div className="overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">当前余额</h3>
              <div className="mt-2">
                <p className="text-3xl font-semibold text-gray-900">{balance} ETH</p>
              </div>
            </div>
          </div>

          {/* 转账表单 */}
          <div className="mt-8 overflow-hidden rounded-lg bg-white shadow">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg font-medium leading-6 text-gray-900">发起转账</h3>
              <form onSubmit={handleSubmit} className="mt-5 space-y-6" role="form">
                <div>
                  <label htmlFor="to" className="block text-sm font-medium text-gray-700">
                    接收地址
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      name="to"
                      id="to"
                      value={formData.to}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="0x..."
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    转账金额 (ETH)
                  </label>
                  <div className="mt-1">
                    <input
                      type="number"
                      name="amount"
                      id="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      step="any"
                      min="0"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="0.0"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="data" className="block text-sm font-medium text-gray-700">
                    附加数据（可选）
                  </label>
                  <div className="mt-1">
                    <textarea
                      name="data"
                      id="data"
                      rows={3}
                      value={formData.data}
                      onChange={handleChange}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      placeholder="0x..."
                    />
                  </div>
                  <p className="mt-2 text-sm text-gray-500">
                    如果您要调用合约，请在此输入调用数据
                  </p>
                </div>

                {error && (
                  <div className="rounded-md bg-red-50 p-4">
                    <div className="text-sm text-red-700">{error}</div>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => router.push('/')}
                    className="mr-3 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-indigo-400"
                  >
                    {isLoading ? '处理中...' : '确认转账'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 