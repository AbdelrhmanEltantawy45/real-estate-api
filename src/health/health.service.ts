import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AppConfigService } from '@/config/app-config.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
  ) {}

  async check() {
    const base = {
      status: 'ok' as 'ok' | 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      environment: this.config.nodeEnv,
      database: 'connected' as 'connected' | 'disconnected',
    };

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return base;
    } catch {
      const degraded = { ...base, status: 'degraded' as const, database: 'disconnected' as const };
      throw new ServiceUnavailableException(degraded);
    }
  }
}
