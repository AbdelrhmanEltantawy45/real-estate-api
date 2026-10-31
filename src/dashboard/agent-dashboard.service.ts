import { Injectable } from '@nestjs/common';
import {
  AppointmentStatus,
  InquiryStatus,
  PropertyStatus,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';

const UPCOMING_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.PENDING,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.RESCHEDULED,
];

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

function bucketByDay(
  rows: { createdAt: Date }[],
  since: Date,
): { date: string; count: number }[] {
  const map = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    map.set(key, 0);
  }
  for (const row of rows) {
    if (row.createdAt < since) continue;
    const key = row.createdAt.toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([date, count]) => ({ date, count }));
}

@Injectable()
export class AgentDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(agentProfileId: string) {
    const [
      statusGroups,
      totalViews,
      totalFavorites,
      totalInquiries,
      upcomingAppointments,
      recentLeads,
    ] = await Promise.all([
      this.prisma.property.groupBy({
        by: ['status'],
        where: { agentId: agentProfileId, deletedAt: null },
        _count: { _all: true },
      }),
      this.prisma.propertyView.count({
        where: { property: { agentId: agentProfileId } },
      }),
      this.prisma.favorite.count({
        where: { property: { agentId: agentProfileId } },
      }),
      this.prisma.inquiry.count({ where: { agentId: agentProfileId } }),
      this.prisma.appointment.count({
        where: {
          agentId: agentProfileId,
          scheduledAt: { gte: new Date() },
          status: { in: UPCOMING_STATUSES },
        },
      }),
      this.prisma.inquiry.findMany({
        where: { agentId: agentProfileId, status: InquiryStatus.NEW },
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { property: { select: { id: true, title: true, slug: true } } },
      }),
    ]);

    const counts = Object.fromEntries(
      statusGroups.map((g) => [g.status, g._count._all]),
    ) as Record<PropertyStatus, number>;

    return {
      totalListings: Object.values(counts).reduce((a, b) => a + b, 0),
      publishedListings: counts[PropertyStatus.PUBLISHED] ?? 0,
      pendingListings: counts[PropertyStatus.PENDING_APPROVAL] ?? 0,
      draftListings: counts[PropertyStatus.DRAFT] ?? 0,
      soldListings: counts[PropertyStatus.SOLD] ?? 0,
      rentedListings: counts[PropertyStatus.RENTED] ?? 0,
      archivedListings: counts[PropertyStatus.ARCHIVED] ?? 0,
      totalViews,
      totalFavorites,
      totalInquiries,
      upcomingAppointments,
      recentLeads,
    };
  }

  async analytics(agentProfileId: string) {
    const since = daysAgo(30);

    const [views, inquiries, properties] = await Promise.all([
      this.prisma.propertyView.findMany({
        where: { property: { agentId: agentProfileId }, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.inquiry.findMany({
        where: { agentId: agentProfileId, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
      this.prisma.property.findMany({
        where: { agentId: agentProfileId, deletedAt: null },
        include: {
          _count: { select: { views: true, favorites: true, inquiries: true } },
        },
      }),
    ]);

    const viewsOverTime = bucketByDay(views, since);
    const inquiriesOverTime = bucketByDay(inquiries, since);

    const popularProperties = (properties as any[])
      .map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        status: p.status,
        price: p.price,
        views: p._count.views,
        favorites: p._count.favorites,
        inquiries: p._count.inquiries,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    const listingPerformance = (properties as any[])
      .map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        views: p._count.views,
        favorites: p._count.favorites,
        inquiries: p._count.inquiries,
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 10);

    return {
      viewsOverTime,
      inquiriesOverTime,
      popularProperties,
      listingPerformance,
    };
  }
}

