import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';

@ApiTags('Appointments')
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly appointments: AppointmentsService) {}

  @Post()
  @ResponseMessage('Appointment request created')
  @ApiOperation({ summary: 'Request a property viewing' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateAppointmentDto) {
    return this.appointments.create(user.id, dto);
  }

  @Get('my')
  @ResponseMessage('Appointments retrieved successfully')
  @ApiOperation({ summary: 'List the user appointments' })
  myList(@CurrentUser() user: AuthenticatedUser, @Query() query: AppointmentQueryDto) {
    return this.appointments.myList(user.id, query);
  }

  @Get(':id')
  @ResponseMessage('Appointment retrieved successfully')
  @ApiOperation({ summary: 'Get one of the user appointments' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.appointments.findOneForUser(user.id, id);
  }

  @Patch(':id')
  @ResponseMessage('Appointment updated successfully')
  @ApiOperation({ summary: 'Reschedule or edit a user appointment' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAppointmentDto,
  ) {
    return this.appointments.update(user.id, id, dto);
  }

  @Post(':id/cancel')
  @ResponseMessage('Appointment cancelled')
  @ApiOperation({ summary: 'Cancel a user appointment' })
  async cancel(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CancelAppointmentDto,
  ) {
    await this.appointments.cancel(user.id, id, dto);
    return null;
  }
}
