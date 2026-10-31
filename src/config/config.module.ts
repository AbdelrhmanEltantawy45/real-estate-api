import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './configuration';
import { AppConfigService } from './app-config.service';

/**
 * Wraps @nestjs/config's ConfigModule and exposes a typed AppConfigService.
 * The class is named AppConfigModule to avoid colliding with the imported
 * `ConfigModule` symbol from @nestjs/config.
 */
@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
