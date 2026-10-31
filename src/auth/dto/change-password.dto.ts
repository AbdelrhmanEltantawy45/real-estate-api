import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  PASSWORD_MAX,
  PASSWORD_MESSAGE,
  PASSWORD_MIN,
  PASSWORD_REGEX,
} from '@/common/constants/password';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  currentPassword!: string;

  @ApiProperty({ minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX })
  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  newPassword!: string;
}
