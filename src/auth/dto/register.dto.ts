import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  PASSWORD_MAX,
  PASSWORD_MESSAGE,
  PASSWORD_MIN,
  PASSWORD_REGEX,
} from '@/common/constants/password';

export class RegisterDto {
  @ApiProperty({ example: 'Ahmed Al-Saud' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName!: string;

  @ApiProperty({ example: 'ahmed@example.com' })
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @ApiProperty({ minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX, example: 'Secret123' })
  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password!: string;

  @ApiPropertyOptional({ example: '+9665XXXXXXXX' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
