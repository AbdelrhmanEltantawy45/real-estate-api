import { ApiProperty } from '@nestjs/swagger';
import { PropertyStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class PropertyStatusDto {
  @ApiProperty({ enum: PropertyStatus })
  @IsEnum(PropertyStatus)
  status!: PropertyStatus;
}
