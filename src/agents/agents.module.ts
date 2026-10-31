import { Module } from '@nestjs/common';
import { AgentsController } from './agents.controller';
import { AgentProfileController } from './agent-profile.controller';
import { AgentsService } from './agents.service';

@Module({
  controllers: [AgentsController, AgentProfileController],
  providers: [AgentsService],
  exports: [AgentsService],
})
export class AgentsModule {}
