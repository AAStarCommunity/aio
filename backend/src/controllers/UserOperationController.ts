import { Request, Response } from 'express';
import { UserOperationService, TransactionRequest } from '../services/UserOperationService';
import { UserOperationRequest } from '../types/userOperation.type';
import logger from '../utils/logger';
import { Controller, Post, Body, Get, Param } from '@nestjs/common';

/**
 * 用户操作控制器
 */
@Controller('api/userop')
export class UserOperationController {
  constructor(private readonly userOperationService: UserOperationService) {}

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
      
      const userOp = await this.userOperationService.createUserOperation(
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

  @Post()
  async sendUserOperation(@Body() userOp: UserOperationRequest) {
    return await this.userOperationService.sendUserOperation(userOp);
  }

  @Get(':hash')
  async getUserOperationStatus(@Param('hash') hash: string) {
    return await this.userOperationService.getUserOperationStatus(hash);
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
      
      const gasEstimation = await this.userOperationService.estimateTransactionGas(
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