import { Request, Response } from 'express';
import { UserOperationService } from '../services/UserOperationService';
import logger from '../utils/logger';

export class UserOperationController {
  constructor(private userOperationService: UserOperationService) {}

  async createUserOperation(req: Request, res: Response): Promise<void> {
    try {
      const { to, value, data } = req.body;
      const userOperation = await this.userOperationService.createUserOperation(to, value, data);
      res.status(200).json({ userOperation });
    } catch (error) {
      logger.error('Failed to create user operation:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  async sendUserOperation(req: Request, res: Response): Promise<void> {
    try {
      const { userOperation } = req.body;
      const userOpHash = await this.userOperationService.sendUserOperation(userOperation);
      res.status(200).json({ userOpHash });
    } catch (error) {
      logger.error('Failed to send user operation:', error);
      res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
} 