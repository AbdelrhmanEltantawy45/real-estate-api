import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PropertyStatus } from '@prisma/client';
import { PaginationDto } from '@/common/dto/pagination.dto';

export class AdminPropertyQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  agentId?: string;
}
