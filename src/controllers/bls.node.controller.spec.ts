import { Test, TestingModule } from '@nestjs/testing';
import { BlsNodeController } from './bls.node.controller';
import { BlsNodeService } from '../services/bls.node.service';
import { BlsNodeStatus } from '../interfaces/bls.interface';

describe('BlsNodeController', () => {
  let controller: BlsNodeController;
  let service: BlsNodeService;

  const mockBlsNodeService = {
    registerNode: jest.fn(),
    updateNodeHeartbeat: jest.fn(),
    requestSignature: jest.fn(),
    getActiveNodes: jest.fn(),
    getNodeStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlsNodeController],
      providers: [
        {
          provide: BlsNodeService,
          useValue: mockBlsNodeService,
        },
      ],
    }).compile();

    controller = module.get<BlsNodeController>(BlsNodeController);
    service = module.get<BlsNodeService>(BlsNodeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('registerNode', () => {
    const mockRequest = {
      publicKey: '0x' + '0'.repeat(96),
      endpoint: 'http://localhost:3000',
    };

    it('should call service.registerNode with correct parameters', async () => {
      const mockResponse = {
        id: 'test-id',
        ...mockRequest,
        status: BlsNodeStatus.ACTIVE,
        lastHeartbeat: new Date(),
        registeredAt: new Date(),
      };

      mockBlsNodeService.registerNode.mockResolvedValue(mockResponse);

      const result = await controller.registerNode(mockRequest);

      expect(result).toBe(mockResponse);
      expect(mockBlsNodeService.registerNode).toHaveBeenCalledWith(mockRequest);
    });
  });

  describe('updateHeartbeat', () => {
    const mockNodeId = 'test-id';
    const mockRequest = {
      timestamp: new Date(),
      signature: '0x' + '1'.repeat(96),
    };

    it('should call service.updateNodeHeartbeat with correct parameters', async () => {
      await controller.updateHeartbeat(mockNodeId, mockRequest);

      expect(mockBlsNodeService.updateNodeHeartbeat).toHaveBeenCalledWith({
        ...mockRequest,
        nodeId: mockNodeId,
      });
    });
  });

  describe('requestSignature', () => {
    const mockNodeId = 'test-id';
    const mockRequest = {
      userOpHash: '0x' + '1'.repeat(64),
      deadline: 1234567890,
    };

    it('should call service.requestSignature with correct parameters', async () => {
      const mockResponse = {
        signature: '0x' + '2'.repeat(96),
        timestamp: new Date(),
      };

      mockBlsNodeService.requestSignature.mockResolvedValue(mockResponse);

      const result = await controller.requestSignature(mockNodeId, mockRequest);

      expect(result).toBe(mockResponse);
      expect(mockBlsNodeService.requestSignature).toHaveBeenCalledWith(mockNodeId, mockRequest);
    });
  });

  describe('getActiveNodes', () => {
    it('should call service.getActiveNodes', async () => {
      const mockNodes = [
        { id: 'node1', status: BlsNodeStatus.ACTIVE },
        { id: 'node2', status: BlsNodeStatus.ACTIVE },
      ];

      mockBlsNodeService.getActiveNodes.mockResolvedValue(mockNodes);

      const result = await controller.getActiveNodes();

      expect(result).toBe(mockNodes);
      expect(mockBlsNodeService.getActiveNodes).toHaveBeenCalled();
    });
  });

  describe('getNodeStatus', () => {
    const mockNodeId = 'test-id';

    it('should call service.getNodeStatus with correct parameters', async () => {
      const mockNode = {
        id: mockNodeId,
        status: BlsNodeStatus.ACTIVE,
      };

      mockBlsNodeService.getNodeStatus.mockResolvedValue(mockNode);

      const result = await controller.getNodeStatus(mockNodeId);

      expect(result).toBe(mockNode);
      expect(mockBlsNodeService.getNodeStatus).toHaveBeenCalledWith(mockNodeId);
    });
  });
}); 