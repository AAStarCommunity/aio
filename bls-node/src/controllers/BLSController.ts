import { Request, Response } from 'express';
import { BLSService } from '../services/blsService';
import logger from '../utils/logger';

export class BLSController {
  private blsService: BLSService;

  constructor() {
    try {
      const privateKey = process.env.BLS_PRIVATE_KEY;
      if (!privateKey) {
        throw new Error('BLS_PRIVATE_KEY environment variable is not set');
      }
      this.blsService = new BLSService(Buffer.from(privateKey, 'hex'));
      logger.info('BLS controller initialized successfully');
    } catch (error: any) {
      logger.error(`Failed to initialize BLS controller: ${error}`);
      throw error;
    }
  }

  /**
   * 对消息进行签名
   * @param req 请求
   * @param res 响应
   */
  async sign(req: Request, res: Response): Promise<void> {
    try {
      logger.debug(`Received sign request with body: ${JSON.stringify(req.body)}`);
      
      const { message } = req.body;
      
      if (!message) {
        logger.warn('Sign request received without message');
        res.status(400).json({ error: 'Message is required' });
        return;
      }
      
      logger.info(`Signing message: ${message}`);
      const signature = await this.blsService.sign(message);
      logger.info(`Message signed successfully with signature: ${signature}`);
      
      res.status(200).json({ signature });
    } catch (error: any) {
      logger.error(`Error in sign: ${error}`);
      res.status(500).json({ error: 'Failed to sign message', details: error.message });
    }
  }

  /**
   * 验证签名
   * @param req 请求
   * @param res 响应
   */
  async verify(req: Request, res: Response): Promise<void> {
    try {
      logger.debug(`Received verify request with body: ${JSON.stringify(req.body)}`);
      
      const { message, signature, publicKey } = req.body;
      
      if (!message || !signature || !publicKey) {
        logger.warn('Verify request received with missing parameters');
        res.status(400).json({ error: 'Message, signature and publicKey are required' });
        return;
      }
      
      logger.info(`Verifying signature for message: ${message}`);
      const isValid = await this.blsService.verify(message, signature, publicKey);
      logger.info(`Signature verification result: ${isValid}`);
      
      res.status(200).json({ valid: isValid });
    } catch (error: any) {
      logger.error(`Error in verify: ${error}`);
      res.status(500).json({ error: 'Failed to verify signature', details: error.message });
    }
  }

  /**
   * 聚合签名
   * @param req 请求
   * @param res 响应
   */
  async aggregateSignatures(req: Request, res: Response): Promise<void> {
    try {
      logger.debug(`Received aggregate request with body: ${JSON.stringify(req.body)}`);
      
      const { signatures } = req.body;
      
      if (!signatures || !Array.isArray(signatures) || signatures.length === 0) {
        logger.warn('Aggregate request received with invalid signatures array');
        res.status(400).json({ error: 'Signatures array is required' });
        return;
      }
      
      logger.info(`Aggregating ${signatures.length} signatures`);
      const aggregatedSignature = await this.blsService.aggregateSignatures(signatures);
      logger.info(`Signatures aggregated successfully: ${aggregatedSignature}`);
      
      res.status(200).json({ aggregatedSignature });
    } catch (error: any) {
      logger.error(`Error in aggregateSignatures: ${error}`);
      res.status(500).json({ error: 'Failed to aggregate signatures', details: error.message });
    }
  }

  /**
   * 获取节点公钥
   * @param req 请求
   * @param res 响应
   */
  async getPublicKey(req: Request, res: Response): Promise<void> {
    try {
      logger.debug('Received get public key request');
      
      const publicKey = this.blsService.getPublicKey();
      logger.info(`Retrieved public key: ${publicKey}`);
      
      res.status(200).json({ publicKey });
    } catch (error: any) {
      logger.error(`Error in getPublicKey: ${error}`);
      res.status(500).json({ error: 'Failed to get public key', details: error.message });
    }
  }
} 