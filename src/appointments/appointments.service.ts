import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AppointmentStatus,
  NotificationType,
  Prisma,
  PropertyStatus,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { propertyPublicInclude } from '@/properties/properties.service';
import { buildPaginationMeta, Paginated } from '@/common/types/pagination';
import { canTransitionAppointment } from './utils/appointment-status';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { CancelAppointmentDto } from './dto/cancel-appointment.dto';
import { AgentAppointmentStatusDto } from './dto/appointment-status.dto';
import { AppointmentQueryDto } from './dto/appointment-query.dto';

const appointmentInclude = {
  property: { include: propertyPublicInclude },
  agent: {
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true, phone: true } },
    },
  },
  user: { select: { id: true, fullName: true, avatarUrl: true, phone: true, email: true } },
} satisfies Prisma.AppointmentInclude;

type AppointmentWithRelations = Prisma.AppointmentGetPayload<{
  include: typeof appointmentInclude;
}>;

@Injectable()
export class AppointmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // --------------------------------------------------------------------------
  // User endpoints
  // --------------------------------------------------------------------------

  async create(userId: string, dto: CreateAppointmentDto): Promise<AppointmentWithRelations> {
    const scheduledAt = new Date(dto.scheduledAt);
    if (scheduledAt.getTime() <= Date.now()) {
      throw new BadRequestException('Appointment time must be in the future');
    }

    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, deletedAt: null, status: PropertyStatus.PUBLISHED },
      include: { agent: { include: { user: true } } },
    });
    if (!property) {
      throw new NotFoundException('Property not found or not available');
    }
    if (!property.agent) {
      throw new BadRequestException('This property has no associated agent');
    }

    const conflict = await this.prisma.appointment.findFirst({
      where: {
        agentId: property.agentId,
        scheduledAt,
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED] },
      },
    });
    if (conflict) {
      throw new ConflictException('The agent already has an appointment at that time');
    }

    const appointment = await this.prisma.appointment.create({
      data: {
        userId,
        agentId: property.agentId,
        propertyId: dto.propertyId,
        scheduledAt,
        message: dto.message ?? null,
        status: AppointmentStatus.PENDING,
      },
      include: appointmentInclude,
    });

    await this.notifications.notify(
      property.agent.userId,
      NotificationType.APPOINTMENT,
      'New appointment request',
      `${appointment.user.fullName} requested a viewing for "${property.title}".`,
      { appointmentId: appointment.id, propertyId: property.id },
    );

    return appointment;
  }

  async myList(userId: string, query: AppointmentQueryDto): Promise<Paginated<AppointmentWithRelations>> {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.AppointmentWhereInput = { userId };
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: appointmentInclude,
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  async findOneForUser(userId: string, id: string): Promise<AppointmentWithRelations> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!appointment || appointment.userId !== userId) {
      throw new NotFoundException('Appointment not found');
    }
    return appointment;
  }

  async update(userId: string, id: string, dto: UpdateAppointmentDto): Promise<AppointmentWithRelations> {
    const existing = await this.findOneForUser(userId, id);
    const data: Prisma.AppointmentUpdateInput = {};
    if (dto.scheduledAt) {
      const scheduledAt = new Date(dto.scheduledAt);
      if (scheduledAt.getTime() <= Date.now()) {
        throw new BadRequestException('Appointment time must be in the future');
      }
      data.scheduledAt = scheduledAt;
      if (existing.status === AppointmentStatus.CONFIRMED) {
        data.status = AppointmentStatus.RESCHEDULED;
      }
    }
    if (dto.message !== undefined) data.message = dto.message;

    const appointment = await this.prisma.appointment.update({
      where: { id },
      data,
      include: appointmentInclude,
    });

    await this.notifications.notify(
      appointment.agent.userId,
      NotificationType.APPOINTMENT,
      'Appointment rescheduled',
      `${appointment.user.fullName} rescheduled the viewing for "${appointment.property.title}".`,
      { appointmentId: appointment.id },
    );
    return appointment;
  }

  async cancel(userId: string, id: string, dto: CancelAppointmentDto): Promise<void> {
    const existing = await this.findOneForUser(userId, id);
    const next = AppointmentStatus.CANCELLED;
    if (!canTransitionAppointment(existing.status, next)) {
      throw new ConflictException(`Cannot cancel an appointment in ${existing.status} status`);
    }
    await this.prisma.appointment.update({
      where: { id },
      data: { status: next, cancellationReason: dto.cancellationReason ?? null },
    });
    await this.notifications.notify(
      existing.agent.userId,
      NotificationType.APPOINTMENT,
      'Appointment cancelled',
      `${existing.user.fullName} cancelled the viewing for "${existing.property.title}".`,
      { appointmentId: existing.id },
    );
  }

  // --------------------------------------------------------------------------
  // Agent endpoints
  // --------------------------------------------------------------------------

  async agentList(agentProfileId: string, query: AppointmentQueryDto): Promise<Paginated<AppointmentWithRelations>> {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.AppointmentWhereInput = { agentId: agentProfileId };
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: appointmentInclude,
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  async agentUpdateStatus(
    agentProfileId: string,
    id: string,
    dto: AgentAppointmentStatusDto,
  ): Promise<AppointmentWithRelations> {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: appointmentInclude,
    });
    if (!appointment || appointment.agentId !== agentProfileId) {
      throw new NotFoundException('Appointment not found');
    }
    if (!canTransitionAppointment(appointment.status, dto.status)) {
      throw new ConflictException(
        `Cannot transition appointment from ${appointment.status} to ${dto.status}`,
      );
    }

    const data: Prisma.AppointmentUpdateInput = { status: dto.status };
    if (dto.scheduledAt) {
      const scheduledAt = new Date(dto.scheduledAt);
      if (scheduledAt.getTime() <= Date.now()) {
        throw new BadRequestException('Appointment time must be in the future');
      }
      data.scheduledAt = scheduledAt;
    }

    const updated = await this.prisma.appointment.update({
      where: { id },
      data,
      include: appointmentInclude,
    });

    const titleMap: Partial<Record<AppointmentStatus, string>> = {
      [AppointmentStatus.CONFIRMED]: 'Appointment confirmed',
      [AppointmentStatus.COMPLETED]: 'Appointment completed',
      [AppointmentStatus.CANCELLED]: 'Appointment cancelled',
      [AppointmentStatus.RESCHEDULED]: 'Appointment rescheduled',
    };
    const title = titleMap[dto.status];
    if (title) {
      await this.notifications.notify(
        appointment.userId,
        NotificationType.APPOINTMENT,
        title,
        `Your viewing for "${appointment.property.title}" was updated to ${dto.status}.`,
        { appointmentId: appointment.id },
      );
    }
    return updated;
  }

  // Used by admin / dashboards that need raw access.
  async countUpcomingForUser(userId: string): Promise<number> {
    return this.prisma.appointment.count({
      where: {
        userId,
        scheduledAt: { gte: new Date() },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED] },
      },
    });
  }

  async countUpcomingForAgent(agentProfileId: string): Promise<number> {
    return this.prisma.appointment.count({
      where: {
        agentId: agentProfileId,
        scheduledAt: { gte: new Date() },
        status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED] },
      },
    });
  }
}
