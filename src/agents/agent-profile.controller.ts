import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { requireAgent } from '@/common/utils/auth.util';
import { AgentsService } from './agents.service';
import { UpdateAgentProfileDto } from './dto/apply-agent.dto';

@ApiTags('Agent Profile')
@Controller('agent/profile')
@Roles(UserRole.AGENT)
export class AgentProfileController {
  constructor(private readonly agents: AgentsService) {}

  @Get()
  @ResponseMessage('Agent profile retrieved successfully')
  @ApiOperation({ summary: 'Get the authenticated agent profile' })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.agents.getMyProfile(requireAgent(user));
  }

  @Patch()
  @ResponseMessage('Agent profile updated successfully')
  @ApiOperation({ summary: 'Update the authenticated agent profile' })
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateAgentProfileDto) {
    return this.agents.updateMyProfile(requireAgent(user), dto);
  }
}
