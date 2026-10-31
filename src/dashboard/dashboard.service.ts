import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  Prisma,
  PropertyStatus,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { buildPaginationMeta, Paginated } from '@/common/types/pagination';
import { propertyPublicInclude, PropertyPublic } from '@/properties/properties.service';
import { PaginationDto } from '@/common/dto/pagination.dto';

const UPCOMING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.RESCHEDULED,
];

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(userId: string) {
    const [
      favoritesCount,
      upcomingAppointmentsCount,
      appointmentsCount,
      unreadNotificationsCount,
      inquiriesCount,
    ] = await Promise.all([
      this.prisma.favorite.count({ where: { userId } }),
      this.prisma.appointment.count({
        where: {
          userId,
          scheduledAt: { gte: new Date() },
          status: { in: UPCOMING_STATUSES },
        },
      }),
      this.prisma.appointment.count({ where: { userId } }),
      this.prisma.notification.count({ where: { userId, isRead: false } }),
      this.prisma.inquiry.count({ where: { userId } }),
    ]);

    return {
      favoritesCount,
      upcomingAppointmentsCount,
      appointmentsCount,
      unreadNotificationsCount,
      inquiriesCount,
    };
  }

  async recentlyViewed(userId: string, limit = 10): Promise<PropertyPublic[]> {
    const views = await this.prisma.propertyView.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit * 4,
      select: { propertyId: true, createdAt: true },
    });
    const seen = new Map<string, Date>();
    for (const v of views) {
      if (!seen.has(v.propertyId)) seen.set(v.propertyId, v.createdAt);
    }
    const ids = [...seen.keys()].slice(0, limit);
    if (!ids.length) return [];
    const properties = await this.prisma.property.findMany({
      where: { id: { in: ids }, deletedAt: null, status: PropertyStatus.PUBLISHED },
      include: propertyPublicInclude,
    });
    const ordered = ids
      .map((id) => properties.find((p) => p.id === id))
      .filter((p): p is PropertyPublic => !!p);
    return ordered as PropertyPublic[];
  }

  async recommendations(userId: string): Promise<PropertyPublic[]> {
    const favorites = await this.prisma.favorite.findMany({
      where: { userId },
      select: { property: { select: { id: true, city: true, propertyType: true } } },
      take: 50,
    });

    const favIds = favorites.map((f) => f.property.id);
    const cities = [...new Set(favorites.map((f) => f.property.city))];
    const types = [...new Set(favorites.map((f) => f.property.propertyType))];

    let items: PropertyPublic[] = [];
    if (cities.length || types.length) {
      const where: Prisma.PropertyWhereInput = {
        status: PropertyStatus.PUBLISHED,
        deletedAt: null,
        id: { notIn: favIds.length ? favIds : undefined },
        OR: [
          ...(cities.length ? [{ city: { in: cities } }] : []),
          ...(types.length ? [{ propertyType: { in: types } }] : []),
        ],
      };
      const matched = await this.prisma.property.findMany({
        where,
        include: propertyPublicInclude,
        orderBy: { createdAt: 'desc' },
        take: 8,
      });
      items = matched as PropertyPublic[];
    }

    if (items.length < 8) {
      const exclude = [...favIds, ...items.map((i) => i.id)];
      const extra = await this.prisma.property.findMany({
        where: {
          status: PropertyStatus.PUBLISHED,
          deletedAt: null,
          id: { notIn: exclude.length ? exclude : undefined },
        },
        include: propertyPublicInclude,
        orderBy: { createdAt: 'desc' },
        take: 8 - items.length,
      });
      items = [...items, ...(extra as PropertyPublic[])];
    }

    return items.slice(0, 8);
  }

  async appointments(
    userId: string,
    query: PaginationDto,
  ): Promise<Paginated<any>> {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.AppointmentWhereInput = {
      userId,
      scheduledAt: { gte: new Date() },
      status: { in: UPCOMING_STATUSES },
    };
    const [items, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          property: { include: propertyPublicInclude },
          agent: {
            include: { user: { select: { id: true, fullName: true, avatarUrl: true, phone: true } } },
          },
        },
        orderBy: { scheduledAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  async notifications(
    userId: string,
    query: PaginationDto,
  ): Promise<Paginated<any>> {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.NotificationWhereInput = { userId };
    const [items, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.notification.count({ where }),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }
}
