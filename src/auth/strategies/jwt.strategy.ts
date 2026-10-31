import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { User } from '@prisma/client';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/config/app-config.service';
import { AuthenticatedUser } from '@/common/decorators/current-user.decorator';

export interface JwtPayload {
  sub: string;
  role: User['role'];
  email: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly prisma: PrismaService,
    config: AppConfigService,
  ) {
    super({
      secretOrKey: config.jwt.accessSecret,
      ignoreExpiration: false,
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req) => req?.cookies?.['access_token'] ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        role: true,
        isActive: true,
        email: true,
        fullName: true,
        agentProfile: { select: { id: true } },
      },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Account is inactive or does not exist');
    }
    return {
      id: user.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      agentProfileId: user.agentProfile?.id ?? null,
    };
  }
}
