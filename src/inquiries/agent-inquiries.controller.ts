import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { requireAgent } from '@/common/utils/auth.util';
import { InquiriesService } from './inquiries.service';
import { InquiryQueryDto } from './dto/inquiry-query.dto';
import { InquiryStatusDto } from './dto/inquiry-status.dto';

@ApiTags('Agent Inquiries')
@Controller('agent/inquiries')
@Roles(UserRole.AGENT)
export class AgentInquiriesController {
  constructor(private readonly inquiries: InquiriesService) {}

  @Get()
  @ResponseMessage('Inquiries retrieved successfully')
  @ApiOperation({ summary: 'List the agent inquiries (leads)' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: InquiryQueryDto) {
    return this.inquiries.agentList(requireAgent(user), query);
  }

  @Get(':id')
  @ResponseMessage('Inquiry retrieved successfully')
  @ApiOperation({ summary: 'Get one of the agent inquiries' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.inquiries.agentFindOne(requireAgent(user), id);
  }

  @Patch(':id/status')
  @ResponseMessage('Inquiry status updated successfully')
  @ApiOperation({ summary: 'Update a lead status' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: InquiryStatusDto,
  ) {
    return this.inquiries.agentUpdateStatus(requireAgent(user), id, dto);
  }
}
