import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { AgentVerificationStatus } from '@prisma/client';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class AgentQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: AgentVerificationStatus })
  @IsOptional()
  @IsEnum(AgentVerificationStatus)
  verificationStatus?: AgentVerificationStatus;
}
