import { Controller, Post, Get, Body, Param, Put } from '@nestjs/common';
import { BlsNodeService } from '../services/bls.node.service';
import {
  BlsRegistrationRequest,
  BlsHeartbeatRequest,
  BlsSignRequest,
  BlsSignResponse,
  BlsNode,
} from '../interfaces/bls.interface';

@Controller('bls-nodes')
export class BlsNodeController {
  constructor(private readonly blsNodeService: BlsNodeService) {}

  @Post()
  async registerNode(@Body() request: BlsRegistrationRequest): Promise<BlsNode> {
    return this.blsNodeService.registerNode(request);
  }

  @Put(':nodeId/heartbeat')
  async updateHeartbeat(
    @Param('nodeId') nodeId: string,
    @Body() request: Omit<BlsHeartbeatRequest, 'nodeId'>,
  ): Promise<void> {
    await this.blsNodeService.updateNodeHeartbeat({
      ...request,
      nodeId,
    });
  }

  @Post(':nodeId/sign')
  async requestSignature(
    @Param('nodeId') nodeId: string,
    @Body() request: BlsSignRequest,
  ): Promise<BlsSignResponse> {
    return this.blsNodeService.requestSignature(nodeId, request);
  }

  @Get()
  async getActiveNodes(): Promise<BlsNode[]> {
    return this.blsNodeService.getActiveNodes();
  }

  @Get(':nodeId')
  async getNodeStatus(@Param('nodeId') nodeId: string): Promise<BlsNode> {
    return this.blsNodeService.getNodeStatus(nodeId);
  }
} 