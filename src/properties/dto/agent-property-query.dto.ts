import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PropertyStatus } from '@prisma/client';
import { PropertyQueryDto } from './property-query.dto';

export class AgentPropertyQueryDto extends PropertyQueryDto {
  @ApiPropertyOptional({ enum: PropertyStatus })
  @IsOptional()
  @IsEnum(PropertyStatus)
  status?: PropertyStatus;
}
