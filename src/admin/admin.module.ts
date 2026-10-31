import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { PrismaModule } from '@/prisma/prisma.module';
import { NotificationsModule } from '@/notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
  ],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}