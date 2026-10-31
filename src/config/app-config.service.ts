import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppConfigService {
  constructor(private readonly config: ConfigService) {}

  get port(): number {
    return this.config.get<number>('port') ?? 3001;
  }
  get nodeEnv(): string {
    return this.config.get<string>('nodeEnv') ?? 'development';
  }
  get isProd(): boolean {
    return this.nodeEnv === 'production';
  }
  get isDev(): boolean {
    return this.nodeEnv !== 'production';
  }
  get appName(): string {
    return this.config.get<string>('appName') ?? 'Real Estate API';
  }
  corsOrigins(): string[] {
    return this.config.get<string[]>('cors.origins') ?? [];
  }
  get enableSwagger(): boolean {
    return this.config.get<boolean>('enableSwagger') ?? true;
  }

  get jwt() {
    return {
      accessSecret: this.config.get<string>('jwt.accessSecret') ?? '',
      refreshSecret: this.config.get<string>('jwt.refreshSecret') ?? '',
      accessExpiresIn: this.config.get<string>('jwt.accessExpiresIn') ?? '15m',
      refreshExpiresIn: this.config.get<string>('jwt.refreshExpiresIn') ?? '7d',
    };
  }

  get auth() {
    return {
      cookieEnabled: this.config.get<boolean>('auth.cookieEnabled') ?? true,
      cookieSecure: this.config.get<boolean>('auth.cookieSecure') ?? false,
      cookieSameSite: this.config.get<string>('auth.cookieSameSite') ?? 'lax',
      cookieDomain: this.config.get<string>('auth.cookieDomain') || undefined,
      cookiePathScoped: this.config.get<boolean>('auth.cookiePathScoped') ?? true,
    };
  }

  get passwordResetExpiresHours(): number {
    return this.config.get<number>('passwordReset.expiresHours') ?? 1;
  }
  get appPublicUrl(): string {
    return this.config.get<string>('appPublicUrl') ?? 'http://localhost:3000';
  }

  get storage() {
    return {
      driver: this.config.get<string>('storage.driver') ?? 'local',
      localUploadDir: this.config.get<string>('storage.localUploadDir') ?? 'uploads',
      publicBaseUrl: this.config.get<string>('storage.publicBaseUrl') ?? 'http://localhost:3001',
      maxUploadSizeBytes: this.config.get<number>('storage.maxUploadSizeBytes') ?? 5242880,
      s3: {
        bucket: this.config.get<string>('storage.s3.bucket') ?? '',
        region: this.config.get<string>('storage.s3.region') ?? '',
        accessKeyId: this.config.get<string>('storage.s3.accessKeyId') ?? '',
        secretAccessKey: this.config.get<string>('storage.s3.secretAccessKey') ?? '',
        endpoint: this.config.get<string>('storage.s3.endpoint') ?? '',
        forcePathStyle: this.config.get<boolean>('storage.s3.forcePathStyle') ?? false,
      },
    };
  }

  get rateLimit() {
    return {
      ttl: this.config.get<number>('rateLimit.ttl') ?? 60,
      limit: this.config.get<number>('rateLimit.limit') ?? 100,
      authTtl: this.config.get<number>('rateLimit.authTtl') ?? 900,
      authLimit: this.config.get<number>('rateLimit.authLimit') ?? 10,
    };
  }
}
