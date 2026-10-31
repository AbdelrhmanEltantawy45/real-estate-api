import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { AgentDashboardController } from './agent-dashboard.controller';
import { AgentDashboardService } from './agent-dashboard.service';

@Module({
  controllers: [DashboardController, AgentDashboardController],
  providers: [DashboardService, AgentDashboardService],
})
export class DashboardModule {}
