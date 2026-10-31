import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({
    description:
      'Opaque refresh token. Required only when AUTH_COOKIE_ENABLED=false; otherwise the token is read from the httpOnly refresh_token cookie.',
  })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}
