import { ApiProperty } from '@nestjs/swagger';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  PASSWORD_MAX,
  PASSWORD_MESSAGE,
  PASSWORD_MIN,
  PASSWORD_REGEX,
} from '@/common/constants/password';

export class ResetPasswordDto {
  @ApiProperty({ description: 'Password reset token sent to the user email' })
  @IsString()
  token!: string;

  @ApiProperty({ minLength: PASSWORD_MIN, maxLength: PASSWORD_MAX, example: 'NewSecret123' })
  @IsString()
  @MinLength(PASSWORD_MIN)
  @MaxLength(PASSWORD_MAX)
  @Matches(PASSWORD_REGEX, { message: PASSWORD_MESSAGE })
  password!: string;
}
