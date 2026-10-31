import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '@/common/decorators/roles.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';
import { requireAgent } from '@/common/utils/auth.util';
import { AppointmentsService } from './appointments.service';
import { AppointmentQueryDto } from './dto/appointment-query.dto';
import { AgentAppointmentStatusDto } from './dto/appointment-status.dto';

@ApiTags('Agent Appointments')
@Controller('agent/appointments')
@Roles(UserRole.AGENT)
export class AgentAppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Get()
  @ResponseMessage('Appointments retrieved successfully')
  @ApiOperation({ summary: 'List the agent appointments' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: AppointmentQueryDto) {
    return this.appointments.agentList(requireAgent(user), query);
  }

  @Patch(':id/status')
  @ResponseMessage('Appointment status updated successfully')
  @ApiOperation({ summary: 'Confirm, complete, reschedule or cancel an appointment' })
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AgentAppointmentStatusDto,
  ) {
    return this.appointments.agentUpdateStatus(requireAgent(user), id, dto);
  }
}
