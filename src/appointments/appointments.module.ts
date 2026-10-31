import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AgentAppointmentsController } from './agent-appointments.controller';
import { AppointmentsService } from './appointments.service';

@Module({
  controllers: [AppointmentsController, AgentAppointmentsController],
  providers: [AppointmentsService],
  exports: [AppointmentsService],
})
export class AppointmentsModule {}
