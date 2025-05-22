import { Request, Response } from 'express';
import { UserOperationService, TransactionRequest } from '../services/UserOperationService';
import { UserOperationRequest } from '../services/BundlerService';
import logger from '../utils/logger';

/**
 * 用户操作控制器
 */
export class UserOperationController {
  private readonly userOpService: UserOperationService;

  constructor() {
    this.userOpService = new UserOperationService();
  }

  /**
   * 创建用户操作
   * @param req 请求
   * @param res 响应
   */
  async createUserOperation(req: Request, res: Response): Promise<void> {
    try {
      const { accountAddress, txRequest, paymasterEnabled } = req.body;
      
      if (!accountAddress || !txRequest) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }
      
      const transaction: TransactionRequest = {
        to: txRequest.to,
        value: txRequest.value || '0',
        data: txRequest.data || '0x',
        operation: txRequest.operation || 0
      };
      
      const userOp = await this.userOpService.createUserOperation(
        accountAddress,
        transaction,
        paymasterEnabled || false
      );
      
      res.status(200).json({ userOperation: userOp });
    } catch (error) {
      logger.error(`Error in createUserOperation: ${error}`);
      res.status(500).json({ error: `Failed to create user operation: ${error}` });
    }
  }

  /**
   * 发送用户操作
   * @param req 请求
   * @param res 响应
   */
  async sendUserOperation(req: Request, res: Response): Promise<void> {
    try {
      const { userOperation } = req.body;
      
      if (!userOperation) {
        res.status(400).json({ error: 'Missing user operation' });
        return;
      }
      
      const userOp: UserOperationRequest = userOperation;
      
      if (!userOp.signature || userOp.signature === '0x') {
        res.status(400).json({ error: 'User operation must be signed before sending' });
        return;
      }
      
      const userOpHash = await this.userOpService.sendUserOperation(userOp);
      
      res.status(200).json({ userOpHash });
    } catch (error) {
      logger.error(`Error in sendUserOperation: ${error}`);
      res.status(500).json({ error: `Failed to send user operation: ${error}` });
    }
  }

  /**
   * 获取用户操作状态
   * @param req 请求
   * @param res 响应
   */
  async getUserOperationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userOpHash } = req.params;
      
      if (!userOpHash) {
        res.status(400).json({ error: 'Missing user operation hash' });
        return;
      }
      
      const status = await this.userOpService.getUserOperationStatus(userOpHash);
      
      res.status(200).json({ status });
    } catch (error) {
      logger.error(`Error in getUserOperationStatus: ${error}`);
      res.status(500).json({ error: `Failed to get user operation status: ${error}` });
    }
  }

  /**
   * 估算交易gas费用
   * @param req 请求
   * @param res 响应
   */
  async estimateTransactionGas(req: Request, res: Response): Promise<void> {
    try {
      const { accountAddress, txRequest, paymasterEnabled } = req.body;
      
      if (!accountAddress || !txRequest) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }
      
      const transaction: TransactionRequest = {
        to: txRequest.to,
        value: txRequest.value || '0',
        data: txRequest.data || '0x',
        operation: txRequest.operation || 0
      };
      
      const gasEstimation = await this.userOpService.estimateTransactionGas(
        accountAddress,
        transaction,
        paymasterEnabled || false
      );
      
      res.status(200).json({ gasEstimation });
    } catch (error) {
      logger.error(`Error in estimateTransactionGas: ${error}`);
      res.status(500).json({ error: `Failed to estimate transaction gas: ${error}` });
    }
  }
} 