import { ApiProperty } from '@nestjs/swagger';
import { AgentVerificationStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class AgentVerificationDto {
  @ApiProperty({ enum: AgentVerificationStatus })
  @IsEnum(AgentVerificationStatus)
  verificationStatus!: AgentVerificationStatus;
}
