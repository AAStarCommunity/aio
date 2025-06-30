import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AAWalletService } from '../aa-wallet.service';

describe('AAWalletService', () => {
  let service: AAWalletService;

  const mockConfig = {
    get: jest.fn((key: string) => {
      const config = {
        'ethereum.rpcUrl': 'http://localhost:8545',
        'ethereum.privateKey': '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
        'ethereum.accountFactoryAddress': '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AAWalletService,
        {
          provide: ConfigService,
          useValue: mockConfig,
        },
      ],
    }).compile();

    service = module.get<AAWalletService>(AAWalletService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate random salt', () => {
    const salt1 = service.generateRandomSalt();
    const salt2 = service.generateRandomSalt();
    
    expect(salt1).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(salt2).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(salt1).not.toBe(salt2);
  });

  it('should generate deterministic salt', () => {
    const email = 'test@example.com';
    const blsPublicKey = '0x' + '0'.repeat(96);
    
    const salt1 = service.generateDeterministicSalt(email, blsPublicKey);
    const salt2 = service.generateDeterministicSalt(email, blsPublicKey);
    
    expect(salt1).toMatch(/^0x[0-9a-fA-F]{64}$/);
    expect(salt1).toBe(salt2);
  });
}); 