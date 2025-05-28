import { create } from 'zustand';
import { AccountState, Transaction, TransferFormData } from '@/types';
import axios from 'axios';
import { ethers } from 'ethers';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

interface AccountStore extends AccountState {
  fetchBalance: (address: string) => Promise<void>;
  fetchTransactions: (address: string) => Promise<void>;
  transfer: (data: TransferFormData) => Promise<void>;
  setError: (error: string | null) => void;
  setLoading: (isLoading: boolean) => void;
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  balance: '0',
  transactions: [],
  isLoading: false,
  error: null,

  setError: (error) => set({ error }),
  setLoading: (isLoading) => set({ isLoading }),

  fetchBalance: async (address) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data } = await axios.get(`${API_BASE_URL}/account/${address}/balance`);
      
      set({ 
        balance: ethers.formatEther(data.balance),
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取余额失败',
        isLoading: false 
      });
    }
  },

  fetchTransactions: async (address) => {
    try {
      set({ isLoading: true, error: null });
      
      const { data } = await axios.get(`${API_BASE_URL}/account/${address}/transactions`);
      
      set({ 
        transactions: data.transactions,
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '获取交易历史失败',
        isLoading: false 
      });
    }
  },

  transfer: async (data) => {
    try {
      set({ isLoading: true, error: null });

      // 1. 创建交易请求
      const { data: userOp } = await axios.post(`${API_BASE_URL}/transaction/create`, {
        to: data.to,
        value: ethers.parseEther(data.amount).toString(),
        data: data.data || '0x'
      });

      // 2. 发送交易
      const { data: { hash } } = await axios.post(`${API_BASE_URL}/transaction/send`, {
        userOperation: userOp
      });

      // 3. 添加到交易列表
      const newTransaction: Transaction = {
        hash,
        from: userOp.sender,
        to: data.to,
        value: data.amount,
        status: 'pending',
        timestamp: new Date().toISOString()
      };

      set(state => ({
        transactions: [newTransaction, ...state.transactions],
        isLoading: false
      }));

      // 4. 开始轮询交易状态
      pollTransactionStatus(hash);
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : '转账失败',
        isLoading: false 
      });
    }
  }
}));

// 轮询交易状态
async function pollTransactionStatus(hash: string) {
  const checkStatus = async () => {
    try {
      const { data } = await axios.get(`${API_BASE_URL}/transaction/${hash}`);
      
      if (data.status !== 'pending') {
        // 更新交易状态
        useAccountStore.setState(state => ({
          transactions: state.transactions.map(tx =>
            tx.hash === hash ? { ...tx, ...data } : tx
          )
        }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to check transaction status:', error);
      return false;
    }
  };

  // 每5秒检查一次，最多检查12次（1分钟）
  let attempts = 0;
  const interval = setInterval(async () => {
    attempts++;
    const isDone = await checkStatus();
    if (isDone || attempts >= 12) {
      clearInterval(interval);
    }
  }, 5000);
} 