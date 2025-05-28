import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { BlsNodeService } from './bls.node.service';
import { BlsNodeEntity } from '../entities/bls.node.entity';
import { BlsNodeStatus } from '../interfaces/bls.interface';
import axios from 'axios';
import * as bls from '@noble/bls12-381';

jest.mock('axios');
jest.mock('@noble/bls12-381');

describe('BlsNodeService', () => {
  let service: BlsNodeService;
  let repository: Repository<BlsNodeEntity>;
  let configService: ConfigService;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    update: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BlsNodeService,
        {
          provide: getRepositoryToken(BlsNodeEntity),
          useValue: mockRepository,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BlsNodeService>(BlsNodeService);
    repository = module.get<Repository<BlsNodeEntity>>(getRepositoryToken(BlsNodeEntity));
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerNode', () => {
    const mockRequest = {
      publicKey: '0x' + '0'.repeat(96),
      endpoint: 'http://localhost:3000',
    };

    it('should successfully register a new node', async () => {
      const mockNode = {
        id: 'test-id',
        ...mockRequest,
        status: BlsNodeStatus.ACTIVE,
        lastHeartbeat: expect.any(Date),
        registeredAt: expect.any(Date),
      };

      (axios.get as jest.Mock).mockResolvedValueOnce({ status: 200 });
      mockRepository.create.mockReturnValue(mockNode);
      mockRepository.save.mockResolvedValue(mockNode);

      const result = await service.registerNode(mockRequest);

      expect(result).toEqual(mockNode);
      expect(axios.get).toHaveBeenCalledWith(`${mockRequest.endpoint}/health`);
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw error for invalid public key', async () => {
      const invalidRequest = {
        ...mockRequest,
        publicKey: 'invalid-key',
      };

      await expect(service.registerNode(invalidRequest)).rejects.toThrow('Invalid BLS public key format');
    });

    it('should throw error for inaccessible endpoint', async () => {
      (axios.get as jest.Mock).mockRejectedValueOnce(new Error());

      await expect(service.registerNode(mockRequest)).rejects.toThrow('Node endpoint is not accessible');
    });
  });

  describe('updateNodeHeartbeat', () => {
    const mockNode = {
      id: 'test-id',
      publicKey: '0x' + '0'.repeat(96),
      status: BlsNodeStatus.ACTIVE,
    };

    const mockRequest = {
      nodeId: 'test-id',
      timestamp: new Date(),
      signature: '0x' + '1'.repeat(96),
    };

    it('should successfully update node heartbeat', async () => {
      mockRepository.findOne.mockResolvedValue(mockNode);
      (bls.verify as jest.Mock).mockResolvedValue(true);

      await service.updateNodeHeartbeat(mockRequest);

      expect(mockRepository.update).toHaveBeenCalledWith(mockNode.id, {
        lastHeartbeat: mockRequest.timestamp,
        status: BlsNodeStatus.ACTIVE,
      });
    });

    it('should throw error for non-existent node', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.updateNodeHeartbeat(mockRequest)).rejects.toThrow('Node not found');
    });

    it('should throw error for invalid signature', async () => {
      mockRepository.findOne.mockResolvedValue(mockNode);
      (bls.verify as jest.Mock).mockResolvedValue(false);

      await expect(service.updateNodeHeartbeat(mockRequest)).rejects.toThrow('Invalid heartbeat signature');
    });
  });

  describe('requestSignature', () => {
    const mockNode = {
      id: 'test-id',
      endpoint: 'http://localhost:3000',
      status: BlsNodeStatus.ACTIVE,
      successfulRequestCount: 0,
      failedRequestCount: 0,
      averageResponseTime: 0,
    };

    const mockRequest = {
      userOpHash: '0x' + '1'.repeat(64),
      deadline: 1234567890,
    };

    it('should successfully request signature from node', async () => {
      const mockResponse = {
        signature: '0x' + '2'.repeat(96),
        timestamp: new Date(),
      };

      mockRepository.findOne.mockResolvedValue(mockNode);
      (axios.post as jest.Mock).mockResolvedValue({ data: mockResponse });

      const result = await service.requestSignature(mockNode.id, mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockRepository.update).toHaveBeenCalled();
    });

    it('should throw error for inactive node', async () => {
      const inactiveNode = { ...mockNode, status: BlsNodeStatus.INACTIVE };
      mockRepository.findOne.mockResolvedValue(inactiveNode);

      await expect(service.requestSignature(mockNode.id, mockRequest)).rejects.toThrow('Node is not available');
    });

    it('should handle node failure correctly', async () => {
      mockRepository.findOne.mockResolvedValue(mockNode);
      (axios.post as jest.Mock).mockRejectedValue(new Error());

      await expect(service.requestSignature(mockNode.id, mockRequest)).rejects.toThrow('Failed to get signature from node');
      expect(mockRepository.update).toHaveBeenCalledWith(mockNode.id, { status: BlsNodeStatus.INACTIVE });
    });
  });

  describe('aggregateSignatures', () => {
    const mockSignatures = [
      { signature: '0x' + '1'.repeat(96), timestamp: new Date() },
      { signature: '0x' + '2'.repeat(96), timestamp: new Date() },
    ];

    it('should successfully aggregate signatures', async () => {
      const mockAggregatedSignature = '0x' + '3'.repeat(96);
      (bls.aggregateSignatures as jest.Mock).mockResolvedValue(Buffer.from(mockAggregatedSignature.slice(2), 'hex'));

      const result = await service.aggregateSignatures(mockSignatures);

      expect(result).toBe(mockAggregatedSignature);
    });

    it('should throw error for empty signatures array', async () => {
      await expect(service.aggregateSignatures([])).rejects.toThrow('No signatures to aggregate');
    });
  });

  describe('getActiveNodes', () => {
    it('should return active nodes sorted by success count', async () => {
      const mockNodes = [
        { id: 'node1', successfulRequestCount: 10 },
        { id: 'node2', successfulRequestCount: 5 },
      ];

      mockRepository.find.mockResolvedValue(mockNodes);

      const result = await service.getActiveNodes();

      expect(result).toEqual(mockNodes);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { status: BlsNodeStatus.ACTIVE },
        order: { successfulRequestCount: 'DESC' },
      });
    });
  });

  describe('getNodeStatus', () => {
    it('should return node status', async () => {
      const mockNode = { id: 'test-id', status: BlsNodeStatus.ACTIVE };
      mockRepository.findOne.mockResolvedValue(mockNode);

      const result = await service.getNodeStatus(mockNode.id);

      expect(result).toEqual(mockNode);
    });

    it('should throw error for non-existent node', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.getNodeStatus('non-existent')).rejects.toThrow('Node not found');
    });
  });
}); 