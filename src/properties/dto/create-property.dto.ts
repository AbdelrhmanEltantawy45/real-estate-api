import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { ListingType, PropertyStatus } from '@prisma/client';

export class CreatePropertyDto {
  @ApiProperty({ example: 'Spacious 3-bedroom apartment in Riyadh' })
  @IsString()
  @MinLength(5)
  @MaxLength(200)
  title!: string;

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(5000)
  description!: string;

  @ApiProperty({ enum: ListingType })
  @IsEnum(ListingType)
  listingType!: ListingType;

  @ApiProperty({ example: 'Apartment' })
  @IsString()
  @MaxLength(50)
  propertyType!: string;

  @ApiProperty({ example: 1200000 })
  @IsNumber()
  @Min(1)
  price!: number;

  @ApiPropertyOptional({ default: 'SAR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({ example: 180 })
  @IsNumber()
  @Min(1)
  area!: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bedrooms?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  bathrooms?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(20)
  parkingSpaces?: number;

  @ApiProperty({ example: 'Riyadh' })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiPropertyOptional({ example: 'Al Olaya' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  neighborhood?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;

  @ApiPropertyOptional({ type: [String], description: 'Amenity IDs to attach' })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  amenityIds?: string[];

  @ApiPropertyOptional({ enum: PropertyStatus, default: 'DRAFT' })
  @IsOptional()
  @IsIn([PropertyStatus.DRAFT, PropertyStatus.PENDING_APPROVAL])
  status?: PropertyStatus;
}
