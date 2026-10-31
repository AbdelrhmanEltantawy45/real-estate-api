import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateInquiryDto {
  @ApiProperty()
  @IsString()
  propertyId!: string;

  @ApiProperty({ example: 'Faisal Al-Harbi' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'faisal@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiPropertyOptional({ example: '+9665XXXXXXXX' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @ApiProperty()
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  message!: string;
}
