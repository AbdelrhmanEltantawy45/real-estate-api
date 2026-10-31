import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppConfigService } from '@/config/app-config.service';
import { parseDurationToMs } from '@/common/utils/time.util';
import { PasswordService } from './password.service';
import { EmailService } from './email.service';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      global: true,
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        secret: config.jwt.accessSecret,
        signOptions: {
          expiresIn: Math.round(parseDurationToMs(config.jwt.accessExpiresIn) / 1000),
        },
      }),
    }),
  ],
  providers: [PasswordService, EmailService],
  exports: [JwtModule, PasswordService, EmailService], // JwtService اتغيّرت لـ JwtModule
})
export class SecurityModule {}