import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import { Request, Response } from 'express';
import { AppConfigService } from '@/config/app-config.service';
import { PrismaService } from '@/prisma/prisma.service';
import { PasswordService } from '@/common/security/password.service';
import { EmailService } from '@/common/security/email.service';
import { generateToken, hashToken } from '@/common/utils/crypto.util';
import { expiryDate, parseDurationToMs } from '@/common/utils/time.util';
import { toSafeUser } from '@/common/utils/serialize.util';
import { userPublicSelect } from '@/common/selects/user.select';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';

export interface AuthResult {
  accessToken: string;
  refreshToken?: string;
  user: Record<string, unknown>;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly password: PasswordService,
    private readonly email: EmailService,
    private readonly config: AppConfigService,
  ) {}

  // --------------------------------------------------------------------------
  // Registration & login
  // --------------------------------------------------------------------------

  async register(dto: RegisterDto, req: Request, res: Response): Promise<AuthResult> {
    const email = normalizeEmail(dto.email);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException('An account with this email already exists');
    }

    const passwordHash = await this.password.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName.trim(),
        email,
        passwordHash,
        phone: dto.phone?.trim() || null,
        role: UserRole.USER,
        emailVerifiedAt: new Date(),
      },
      select: userPublicSelect,
    });

    return this.issueAndBuild(user, req, res);
  }

  async login(dto: LoginDto, req: Request, res: Response): Promise<AuthResult> {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { ...userPublicSelect, passwordHash: true },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const valid = await this.password.verify(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }
    const { passwordHash: _omit, ...publicUser } = user;
    return this.issueAndBuild(publicUser as any, req, res);
  }

  // --------------------------------------------------------------------------
  // Token rotation
  // --------------------------------------------------------------------------

  async refresh(req: Request, res: Response): Promise<AuthResult> {
    const token = this.readRefreshToken(req);
    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }
    const tokenHash = hashToken(token);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: { select: { ...userPublicSelect, isActive: true } },
      },
    });
    if (!stored) {
      throw new UnauthorizedException('Invalid refresh token');
    }
    if (stored.revokedAt) {
      // Refresh-token reuse detected: revoke every active token for this user.
      await this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw new UnauthorizedException('Refresh token has been revoked');
    }
    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }
    if (!stored.user.isActive) {
      throw new UnauthorizedException('Account has been deactivated');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    const user = stored.user;
    return this.issueAndBuild(user as any, req, res);
  }

  async logout(req: Request, res: Response): Promise<void> {
    const token = this.readRefreshToken(req);
    if (token) {
      const tokenHash = hashToken(token);
      await this.prisma.refreshToken
        .updateMany({
          where: { tokenHash, revokedAt: null },
          data: { revokedAt: new Date() },
        })
        .catch(() => undefined);
    }
    this.clearAuthCookies(res);
  }

  // --------------------------------------------------------------------------
  // Authenticated actions
  // --------------------------------------------------------------------------

  async me(userId: string): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: userPublicSelect,
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return toSafeUser(user as any) as Record<string, unknown>;
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    req: Request,
    res: Response,
  ): Promise<Record<string, unknown>> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    const valid = await this.password.verify(user.passwordHash, dto.currentPassword);
    if (!valid) {
      throw new BadRequestException('Current password is incorrect');
    }
    const passwordHash = await this.password.hash(dto.newPassword);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    // Force re-authentication on every active session.
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return this.me(userId);
  }

  // --------------------------------------------------------------------------
  // Password reset
  // --------------------------------------------------------------------------

  async forgotPassword(dto: ForgotPasswordDto): Promise<{ resetLink?: string }> {
    const email = normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, fullName: true, email: true },
    });
    if (!user) {
      // Do not leak whether the account exists.
      return {};
    }

    const token = generateToken(32);
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: expiryDate(this.config.passwordResetExpiresHours * 60 * 60 * 1000),
      },
    });

    const resetLink = `${this.config.appPublicUrl}/reset-password?token=${token}`;
    await this.email.send({
      to: user.email,
      subject: 'Reset your password',
      text: `Hello ${user.fullName},\n\nUse the link below to reset your password. It expires in ${this.config.passwordResetExpiresHours} hour(s).\n\n${resetLink}\n\nIf you did not request this, ignore this email.`,
    });

    // In development (no email provider) we surface the link for convenience.
    if (this.config.isDev) {
      return { resetLink };
    }
    return {};
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const tokenHash = hashToken(dto.token);
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });
    if (!stored || stored.usedAt || stored.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }
    const passwordHash = await this.password.hash(dto.password);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private async issueAndBuild(
    user: Record<string, any>,
    req: Request,
    res: Response,
  ): Promise<AuthResult> {
    const accessToken = this.jwt.sign({
      sub: user.id,
      role: user.role,
      email: user.email,
    });
    const refreshToken = generateToken(32);
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: expiryDate(this.config.jwt.refreshExpiresIn),
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
      },
    });

    const result: AuthResult = {
      accessToken,
      user: toSafeUser(user) as Record<string, unknown>,
    };

    if (this.config.auth.cookieEnabled) {
      this.setAuthCookies(res, accessToken, refreshToken);
    } else {
      result.refreshToken = refreshToken;
    }
    return result;
  }

  private readRefreshToken(req: Request): string | undefined {
    if (this.config.auth.cookieEnabled) {
      return req.cookies?.[REFRESH_COOKIE] || undefined;
    }
    return req.body?.refreshToken || undefined;
  }

  private setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const { cookieSecure, cookieSameSite, cookieDomain, cookiePathScoped } =
      this.config.auth;
    const base = {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite as 'lax' | 'strict' | 'none',
      domain: cookieDomain,
    };
    res.cookie(ACCESS_COOKIE, accessToken, {
      ...base,
      path: '/',
      maxAge: parseDurationToMs(this.config.jwt.accessExpiresIn),
    });
    res.cookie(REFRESH_COOKIE, refreshToken, {
      ...base,
      path: cookiePathScoped ? '/api/v1/auth' : '/',
      maxAge: parseDurationToMs(this.config.jwt.refreshExpiresIn),
    });
  }

  private clearAuthCookies(res: Response): void {
    const { cookieSecure, cookieSameSite, cookieDomain, cookiePathScoped } =
      this.config.auth;
    const base = {
      httpOnly: true,
      secure: cookieSecure,
      sameSite: cookieSameSite as 'lax' | 'strict' | 'none',
      domain: cookieDomain,
    };
    res.clearCookie(ACCESS_COOKIE, { ...base, path: '/' });
    res.clearCookie(REFRESH_COOKIE, {
      ...base,
      path: cookiePathScoped ? '/api/v1/auth' : '/',
    });
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

