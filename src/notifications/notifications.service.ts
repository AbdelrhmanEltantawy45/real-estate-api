import { Injectable } from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Shared service for creating in-app notifications. Other modules inject this
 * to notify users of important events (inquiries, appointments, approvals...).
 */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notify(
    userId: string,
    type: NotificationType,
    title: string,
    message: string,
    metadata?: Record<string, unknown>,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata: (metadata ?? null) as Prisma.InputJsonValue,
      },
    });
  }
}
