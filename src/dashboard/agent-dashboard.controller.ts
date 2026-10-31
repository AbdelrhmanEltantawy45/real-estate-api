import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { requireAgent } from '@/common/utils/auth.util';
import { AgentDashboardService } from './agent-dashboard.service';

@ApiTags('Agent Dashboard')
@Controller('agent/dashboard')
@Roles(UserRole.AGENT)
export class AgentDashboardController {
  constructor(private readonly dashboard: AgentDashboardService) {}

  @Get('overview')
  @ResponseMessage('Agent dashboard overview retrieved successfully')
  @ApiOperation({ summary: 'Agent dashboard overview metrics' })
  overview(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.overview(requireAgent(user));
  }

  @Get('analytics')
  @ResponseMessage('Agent analytics retrieved successfully')
  @ApiOperation({ summary: 'Agent dashboard analytics' })
  analytics(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.analytics(requireAgent(user));
  }
}
