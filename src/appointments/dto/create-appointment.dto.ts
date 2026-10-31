import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ example: 'c1a2b3d4-...' })
  @IsString()
  propertyId!: string;

  @ApiProperty({ example: '2026-11-10T10:00:00.000Z', description: 'ISO 8601, must be in the future' })
  @IsDateString()
  scheduledAt!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message?: string;
}
