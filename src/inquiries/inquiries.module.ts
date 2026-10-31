import { Module } from '@nestjs/common';
import { InquiriesController } from './inquiries.controller';
import { AgentInquiriesController } from './agent-inquiries.controller';
import { InquiriesService } from './inquiries.service';

@Module({
  controllers: [InquiriesController, AgentInquiriesController],
  providers: [InquiriesService],
  exports: [InquiriesService],
})
export class InquiriesModule {}
