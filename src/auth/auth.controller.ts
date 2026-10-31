import { Body, Controller, Get, Patch, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AuthenticatedUser, CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { ResponseMessage } from '@/common/decorators/response-message.decorator';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const AUTH_THROTTLE = { default: { limit: 20, ttl: 15 * 60 * 1000 } };
const RESET_THROTTLE = { default: { limit: 5, ttl: 15 * 60 * 1000 } };

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('register')
  @ResponseMessage('Account created successfully')
  @ApiOperation({ summary: 'Register a new user account' })
  register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(dto, req, res);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @ResponseMessage('Login successful')
  @ApiOperation({ summary: 'Authenticate a user and issue tokens' })
  login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, req, res);
  }

  @Public()
  @Throttle(AUTH_THROTTLE)
  @Post('refresh')
  @ResponseMessage('Token refreshed successfully')
  @ApiOperation({ summary: 'Exchange a refresh token for a new access token' })
  @ApiBody({ type: RefreshDto, required: false })
  refresh(@Body() dto: RefreshDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    if (dto?.refreshToken) req.body.refreshToken = dto.refreshToken;
    return this.authService.refresh(req, res);
  }

  @Public()
  @Post('logout')
  @ResponseMessage('Logged out successfully')
  @ApiOperation({ summary: 'Revoke the current refresh token and clear cookies' })
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.authService.logout(req, res);
    return null;
  }

  @Public()
  @Throttle(RESET_THROTTLE)
  @Post('forgot-password')
  @ResponseMessage('If an account exists for that email, a reset link has been sent')
  @ApiOperation({ summary: 'Request a password reset link' })
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Public()
  @Throttle(RESET_THROTTLE)
  @Post('reset-password')
  @ResponseMessage('Password reset successfully')
  @ApiOperation({ summary: 'Reset a password using a reset token' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return null;
  }

  @Get('me')
  @ResponseMessage('Profile retrieved successfully')
  @ApiOperation({ summary: 'Get the authenticated user profile' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user.id);
  }

  @Patch('change-password')
  @ResponseMessage('Password changed successfully')
  @ApiOperation({ summary: 'Change the authenticated user password' })
  changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.changePassword(user.id, dto, req, res);
  }
}
