import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppConfigService } from './config/app-config.service';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { SecurityModule } from './common/security/security.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UploadsModule } from './uploads/uploads.module';
import { AuthModule } from './auth/auth.module';
import { PropertiesModule } from './properties/properties.module';
import { AmenitiesModule } from './amenities/amenities.module';
import { FavoritesModule } from './favorites/favorites.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { InquiriesModule } from './inquiries/inquiries.module';
import { AgentsModule } from './agents/agents.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AdminModule } from './admin/admin.module';
import { HealthModule } from './health/health.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    SecurityModule,
    NotificationsModule,
    ReviewsModule,
    UploadsModule,
    ThrottlerModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => [
        {
          ttl: config.rateLimit.ttl * 1000,
          limit: config.rateLimit.limit,
        },
      ],
    }),
    AuthModule,
    PropertiesModule,
    AmenitiesModule,
    FavoritesModule,
    AppointmentsModule,
    InquiriesModule,
    AgentsModule,
    DashboardModule,
    AdminModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: ResponseInterceptor },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
