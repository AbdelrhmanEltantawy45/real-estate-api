import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { PartialType } from '@nestjs/swagger';

export class CreateAmenityDto {
  @ApiProperty({ example: 'Swimming Pool' })
  @IsString()
  @MinLength(2)
  @MaxLength(60)
  name!: string;

  @ApiPropertyOptional({ description: 'Auto-generated from name if omitted' })
  @IsOptional()
  @IsString()
  slug?: string;

  @ApiPropertyOptional({ default: 'General' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  category?: string;
}

export class UpdateAmenityDto extends PartialType(CreateAmenityDto) {}

