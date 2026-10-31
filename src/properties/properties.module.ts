import { Module } from '@nestjs/common';
import { PropertiesController } from './properties.controller';
import { AgentPropertiesController } from './agent-properties.controller';
import { PropertiesService } from './properties.service';

@Module({
  controllers: [PropertiesController, AgentPropertiesController],
  providers: [PropertiesService],
  exports: [PropertiesService],
})
export class PropertiesModule {}
