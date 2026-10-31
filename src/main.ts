import { BadRequestException, Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'fs';
import helmet from 'helmet';
import { join } from 'path';
import { AppModule } from './app.module';
import { AppConfigService } from './config/app-config.service';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { flattenValidationErrors } from './common/utils/validation.util';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const config = app.get(AppConfigService);

  app.setGlobalPrefix('api/v1');

  app.enableCors({
    origin: config.corsOrigins(),
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());

  // Serve locally uploaded files (only relevant when STORAGE_DRIVER=local).
  if (config.storage.driver === 'local') {
    const uploadDir = join(process.cwd(), config.storage.localUploadDir);
    mkdirSync(uploadDir, { recursive: true });
    app.useStaticAssets(uploadDir, { prefix: '/uploads/' });
  }

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors) =>
        new BadRequestException({
          success: false,
          message: 'Validation failed',
          errors: flattenValidationErrors(errors),
        }),
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new ResponseInterceptor(reflector));

  if (config.enableSwagger) {
    const docConfig = new DocumentBuilder()
      .setTitle(config.appName)
      .setDescription(
        'Production-ready Real Estate backend API. All authenticated routes expect a Bearer access token. ' +
          'Refresh tokens are delivered as an httpOnly cookie when AUTH_COOKIE_ENABLED=true.',
      )
      .setVersion('1.0')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', name: 'Authorization' },
        'access-token',
      )
      .addTag('Health')
      .addTag('Auth')
      .addTag('Users')
      .addTag('Agents')
      .addTag('Properties')
      .addTag('Amenities')
      .addTag('Favorites')
      .addTag('Appointments')
      .addTag('Inquiries')
      .addTag('Notifications')
      .addTag('Reviews')
      .addTag('Uploads')
      .addTag('Dashboard')
      .addTag('Admin')
      .build();
    const document = SwaggerModule.createDocument(app, docConfig);
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen(config.port);

  const logger = new Logger('Bootstrap');
  logger.log(`Server running on http://localhost:${config.port} (${config.nodeEnv})`);
  if (config.enableSwagger) {
    logger.log(`Swagger docs at http://localhost:${config.port}/docs`);
  }
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to start application', err);
  process.exit(1);
});
