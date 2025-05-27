import { IPaymasterService } from '../interfaces/paymaster.interface';
import { PimlicoPaymasterService } from './pimlico.paymaster.service';

export enum PaymasterType {
  PIMLICO = 'pimlico',
  CUSTOM = 'custom',
}

export class PaymasterFactory {
  private static instance: PaymasterFactory;
  private paymasterServices: Map<PaymasterType, IPaymasterService>;

  private constructor() {
    this.paymasterServices = new Map();
    // 初始化支持的paymaster服务
    this.paymasterServices.set(PaymasterType.PIMLICO, new PimlicoPaymasterService());
  }

  public static getInstance(): PaymasterFactory {
    if (!PaymasterFactory.instance) {
      PaymasterFactory.instance = new PaymasterFactory();
    }
    return PaymasterFactory.instance;
  }

  public getPaymasterService(type: PaymasterType): IPaymasterService {
    const service = this.paymasterServices.get(type);
    if (!service) {
      throw new Error(`Paymaster service ${type} not found`);
    }
    return service;
  }

  public registerPaymasterService(type: PaymasterType, service: IPaymasterService): void {
    this.paymasterServices.set(type, service);
  }

  public async verifyAllPaymasterServices(): Promise<Map<PaymasterType, boolean>> {
    const results = new Map<PaymasterType, boolean>();
    
    for (const [type, service] of this.paymasterServices) {
      try {
        const status = await service.verifyPaymasterStatus();
        results.set(type, status);
      } catch (error) {
        console.error(`Failed to verify ${type} paymaster:`, error);
        results.set(type, false);
      }
    }
    
    return results;
  }
} 