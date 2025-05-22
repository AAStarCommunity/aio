import { Request, Response } from 'express';
import { BLSService } from '../services/BLSService';
import logger from '../utils/logger';

export class BLSController {
  private readonly blsService: BLSService;

  constructor() {
    this.blsService = new BLSService();
  }

  /**
   * 对消息进行签名
   * @param req 请求
   * @param res 响应
   */
  async sign(req: Request, res: Response): Promise<void> {
    try {
      const { message } = req.body;
      
      if (!message) {
        res.status(400).json({ error: 'Missing message parameter' });
        return;
      }
      
      const signature = await this.blsService.sign(message);
      
      res.status(200).json({ signature });
    } catch (error) {
      logger.error(`Error in sign: ${error}`);
      res.status(500).json({ error: `Failed to sign message: ${error}` });
    }
  }

  /**
   * 验证签名
   * @param req 请求
   * @param res 响应
   */
  async verify(req: Request, res: Response): Promise<void> {
    try {
      const { message, signature, publicKey } = req.body;
      
      if (!message || !signature || !publicKey) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }
      
      const isValid = await this.blsService.verify(message, signature, publicKey);
      
      res.status(200).json({ isValid });
    } catch (error) {
      logger.error(`Error in verify: ${error}`);
      res.status(500).json({ error: `Failed to verify signature: ${error}` });
    }
  }

  /**
   * 聚合签名
   * @param req 请求
   * @param res 响应
   */
  async aggregateSignatures(req: Request, res: Response): Promise<void> {
    try {
      const { signatures } = req.body;
      
      if (!signatures || !Array.isArray(signatures) || signatures.length === 0) {
        res.status(400).json({ error: 'Invalid signatures parameter' });
        return;
      }
      
      const aggregatedSignature = await this.blsService.aggregateSignatures(signatures);
      
      res.status(200).json({ aggregatedSignature });
    } catch (error) {
      logger.error(`Error in aggregateSignatures: ${error}`);
      res.status(500).json({ error: `Failed to aggregate signatures: ${error}` });
    }
  }

  /**
   * 获取节点公钥
   * @param req 请求
   * @param res 响应
   */
  async getPublicKey(req: Request, res: Response): Promise<void> {
    try {
      const publicKey = this.blsService.getPublicKey();
      
      res.status(200).json({ publicKey });
    } catch (error) {
      logger.error(`Error in getPublicKey: ${error}`);
      res.status(500).json({ error: `Failed to get public key: ${error}` });
    }
  }
} 