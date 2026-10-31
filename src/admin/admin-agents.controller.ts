import { Body, Controller, Get, Param, Patch, Query, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { AuditService } from './audit/audit.service';
import { AdminAgentQueryDto } from './dto/admin-agent-query.dto';
import { AgentVerificationDto } from './dto/agent-verification.dto';

@ApiTags('Admin Agents')
@Controller('admin/agents')
@Roles(UserRole.ADMIN)
export class AdminAgentsController {
  constructor(
    private readonly admin: AdminService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @ResponseMessage('Agents retrieved successfully')
  @ApiOperation({ summary: 'List agent profiles' })
  list(@Query() query: AdminAgentQueryDto) {
    return this.admin.agentsList(query);
  }

  @Get(':id')
  @ResponseMessage('Agent retrieved successfully')
  findOne(@Param('id') id: string) {
    return this.admin.agentFindOne(id);
  }

  @Patch(':id/verification')
  @ResponseMessage('Agent verification updated successfully')
  async updateVerification(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AgentVerificationDto,
    @Req() req: Request,
  ) {
    const result = await this.admin.updateAgentVerification(user.id, id, dto.verificationStatus, req.ip);
    this.audit.log({
      actorUserId: user.id,
      action: 'UPDATE_AGENT_VERIFICATION',
      targetType: 'AgentProfile',
      targetId: id,
      metadata: { verificationStatus: dto.verificationStatus },
      ipAddress: req.ip,
    });
    return result;
  }
}
