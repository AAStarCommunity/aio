import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/auth';
import { useAccountStore } from '@/store/account';
import Layout from '@/components/layout/Layout';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { balance, transactions, fetchBalance, fetchTransactions, isLoading } = useAccountStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (user?.aaAddress) {
      fetchBalance(user.aaAddress);
      fetchTransactions(user.aaAddress);
    }
  }, [isAuthenticated, user]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 账户信息卡片 */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <div className="sm:flex sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-medium leading-6 text-gray-900">账户信息</h3>
                <div className="mt-2 max-w-xl text-sm text-gray-500">
                  <p>邮箱：{user?.email}</p>
                  <p className="mt-1">账户地址：{user?.aaAddress}</p>
                </div>
              </div>
              <div className="mt-5 sm:mt-0">
                <Link
                  href="/transfer"
                  className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  发起转账
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* 余额卡片 */}
        <div className="mt-8 overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">账户余额</h3>
            <div className="mt-2">
              {isLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 w-32 bg-gray-200 rounded"></div>
                </div>
              ) : (
                <p className="text-3xl font-semibold text-gray-900">{balance} ETH</p>
              )}
            </div>
          </div>
        </div>

        {/* 最近交易 */}
        <div className="mt-8">
          <div className="sm:flex sm:items-center">
            <div className="sm:flex-auto">
              <h3 className="text-lg font-medium leading-6 text-gray-900">最近交易</h3>
              <p className="mt-2 text-sm text-gray-700">
                显示最近的5笔交易记录
              </p>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-16 sm:flex-none">
              <Link
                href="/transactions"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
              >
                查看全部 <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>
          <div className="mt-4 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                {isLoading ? (
                  <div className="animate-pulse space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="h-16 bg-gray-200 rounded"></div>
                    ))}
                  </div>
                ) : transactions.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead>
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">
                          交易哈希
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          接收地址
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          金额
                        </th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                          状态
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {transactions.slice(0, 5).map((transaction) => (
                        <tr key={transaction.hash}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-900 sm:pl-0">
                            {transaction.hash.slice(0, 10)}...{transaction.hash.slice(-8)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {transaction.to.slice(0, 10)}...{transaction.to.slice(-8)}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {transaction.value} ETH
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm">
                            <span
                              className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${
                                transaction.status === 'success'
                                  ? 'bg-green-100 text-green-800'
                                  : transaction.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {transaction.status === 'success'
                                ? '成功'
                                : transaction.status === 'pending'
                                ? '处理中'
                                : '失败'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500">暂无交易记录</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 