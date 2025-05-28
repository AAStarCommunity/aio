import { Controller, Post, Body, Get, Param, Put } from '@nestjs/common';
import { BlsNodeService } from '../services/bls.node.service';
import { BlsRegistrationRequest, BlsHeartbeatRequest, BlsSignRequest } from '../interfaces/bls.interface';

@Controller('bls/nodes')
export class BlsNodeController {
  constructor(private readonly blsNodeService: BlsNodeService) {}

  @Post('register')
  async registerNode(@Body() request: BlsRegistrationRequest) {
    return this.blsNodeService.registerNode(request);
  }

  @Put(':nodeId/heartbeat')
  async updateHeartbeat(
    @Param('nodeId') nodeId: string,
    @Body() request: BlsHeartbeatRequest
  ) {
    return this.blsNodeService.updateNodeHeartbeat({
      ...request,
      nodeId,
    });
  }

  @Post(':nodeId/sign')
  async requestSignature(
    @Param('nodeId') nodeId: string,
    @Body() request: BlsSignRequest
  ) {
    return this.blsNodeService.requestSignature(nodeId, request);
  }

  @Get('active')
  async getActiveNodes() {
    return this.blsNodeService.getActiveNodes();
  }

  @Get(':nodeId/status')
  async getNodeStatus(@Param('nodeId') nodeId: string) {
    return this.blsNodeService.getNodeStatus(nodeId);
  }
} 