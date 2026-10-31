import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class ApplyAgentDto {
  @ApiPropertyOptional({ example: 'Al-Mamlaka Real Estate' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  agencyName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  bio?: string;

  @ApiPropertyOptional({ example: 'Riyadh-12345' })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  licenseNumber?: string;

  @ApiProperty({ type: [String], example: ['Residential', 'Luxury'] })
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  specialties!: string[];
}

export class UpdateAgentProfileDto extends PartialType(ApplyAgentDto) {}
