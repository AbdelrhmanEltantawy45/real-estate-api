import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  log(params: {
    actorUserId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
  }) {
    return this.prisma.auditLog
      .create({
        data: {
          actorUserId: params.actorUserId,
          action: params.action,
          targetType: params.targetType ?? null,
          targetId: params.targetId ?? null,
          metadata: (params.metadata ?? null) as Prisma.InputJsonValue,
          ipAddress: params.ipAddress ?? null,
        },
      })
      .catch((err) => {
        // Audit logging must never break the main operation.
        this.logger.error(`Failed to write audit log: ${(err as Error).message}`);
      });
  }
}
