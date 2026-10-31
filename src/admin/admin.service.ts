import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AgentVerificationStatus,
  NotificationType,
  Prisma,
  PropertyStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { buildPaginationMeta, Paginated } from '@/common/types/pagination';
import { userPublicSelect } from '@/common/selects/user.select';
import { propertyPublicInclude } from '@/properties/properties.service';
import { canTransition } from '@/properties/utils/property-status';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AdminUserQueryDto } from './dto/admin-user-query.dto';
import { AdminPropertyQueryDto } from './dto/admin-property-query.dto';
import { AdminAgentQueryDto } from './dto/admin-agent-query.dto';

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 86_400_000);
}

function bucketByDay(rows: { createdAt: Date }[]): { date: string; count: number }[] {
  const map = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const key = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    map.set(key, 0);
  }
  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    if (map.has(key)) map.set(key, (map.get(key) ?? 0) + 1);
  }
  return [...map.entries()].map(([date, count]) => ({ date, count }));
}

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // --------------------------------------------------------------------------
  // Dashboard
  // --------------------------------------------------------------------------

  async dashboardOverview() {
    const [
      totalUsers,
      totalAgents,
      totalProperties,
      publishedProperties,
      pendingProperties,
      pendingApprovals,
      totalInquiries,
      totalAppointments,
      pendingAgentVerifications,
      totalFavorites,
      totalViews,
      rolesGroup,
      statusGroup,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.agentProfile.count(),
      this.prisma.property.count({ where: { deletedAt: null } }),
      this.prisma.property.count({ where: { status: PropertyStatus.PUBLISHED, deletedAt: null } }),
      this.prisma.property.count({ where: { status: PropertyStatus.PENDING_APPROVAL, deletedAt: null } }),
      this.prisma.property.count({ where: { status: PropertyStatus.PENDING_APPROVAL, deletedAt: null } }),
      this.prisma.inquiry.count(),
      this.prisma.appointment.count(),
      this.prisma.agentProfile.count({ where: { verificationStatus: AgentVerificationStatus.PENDING } }),
      this.prisma.favorite.count(),
      this.prisma.propertyView.count(),
      this.prisma.user.groupBy({ by: ['role'], _count: { _all: true } }),
      this.prisma.property.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
    ]);

    return {
      totalUsers,
      totalAgents,
      totalProperties,
      publishedProperties,
      pendingProperties,
      pendingApprovals,
      totalInquiries,
      totalAppointments,
      pendingAgentVerifications,
      totalFavorites,
      totalViews,
      usersByRole: Object.fromEntries(rolesGroup.map((r) => [r.role, r._count._all])),
      propertiesByStatus: Object.fromEntries(statusGroup.map((s) => [s.status, s._count._all])),
    };
  }

  async dashboardAnalytics() {
    const since = daysAgo(30);

    const [users, properties, inquiries, statusGroup, typeGroup, topAgentGroups] =
      await Promise.all([
        this.prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        this.prisma.property.findMany({
          where: { createdAt: { gte: since }, deletedAt: null },
          select: { createdAt: true },
        }),
        this.prisma.inquiry.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
        this.prisma.property.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
        this.prisma.property.groupBy({ by: ['propertyType'], where: { deletedAt: null, status: PropertyStatus.PUBLISHED }, _count: { _all: true } }),
        this.prisma.property.groupBy({
          by: ['agentId'],
          where: { status: PropertyStatus.PUBLISHED, deletedAt: null },
          _count: { _all: true },
          orderBy: { _count: { agentId: 'desc' } },
          take: 5,
        }),
      ]);

    const topAgentIds = topAgentGroups.map((g) => g.agentId);
    const topAgents = topAgentIds.length
      ? await this.prisma.agentProfile.findMany({
          where: { id: { in: topAgentIds } },
          include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
        })
      : [];
    const agentMap = new Map(topAgents.map((a) => [a.id, a]));

    return {
      newUsersOverTime: bucketByDay(users),
      newPropertiesOverTime: bucketByDay(properties),
      inquiriesOverTime: bucketByDay(inquiries),
      propertiesByStatus: Object.fromEntries(statusGroup.map((s) => [s.status, s._count._all])),
      propertiesByType: Object.fromEntries(typeGroup.map((t) => [t.propertyType, t._count._all])),
      topAgents: topAgentGroups.map((g) => {
        const agent = agentMap.get(g.agentId);
        return {
          agentId: g.agentId,
          fullName: agent?.user.fullName,
          agencyName: agent?.agencyName,
          publishedListings: g._count._all,
        };
      }),
    };
  }

  // --------------------------------------------------------------------------
  // Users
  // --------------------------------------------------------------------------

  async usersList(query: AdminUserQueryDto) {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.UserWhereInput = {};
    if (query.role) where.role = query.role;
    if (query.isActive !== undefined) where.isActive = query.isActive;
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: userPublicSelect,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  async userFindOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userPublicSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateUserStatus(actorId: string, id: string, isActive: boolean, ip?: string) {
    if (actorId === id) {
      throw new ForbiddenException('You cannot change your own active status');
    }
    const user = await this.prisma.user.findUnique({ where: { id }, select: { id: true, isActive: true, fullName: true } });
    if (!user) throw new NotFoundException('User not found');
    const updated = await this.prisma.user.update({ where: { id }, data: { isActive }, select: userPublicSelect });
    await this.notifications.notify(
      id,
      NotificationType.ACCOUNT,
      'Account status updated',
      `Your account has been ${isActive ? 'activated' : 'deactivated'} by an administrator.`,
      {},
    );
    return updated;
  }

  async updateUserRole(actorId: string, id: string, role: UserRole, ip?: string) {
    if (actorId === id) {
      throw new ForbiddenException('You cannot change your own role');
    }
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, agentProfile: { select: { id: true } } },
    });
    if (!user) throw new NotFoundException('User not found');

    // Ensure an agent profile exists when promoting to AGENT.
    if (role === UserRole.AGENT && !user.agentProfile) {
      await this.prisma.agentProfile.create({
        data: { userId: id, verificationStatus: AgentVerificationStatus.PENDING, specialties: [] },
      });
    }
    const updated = await this.prisma.user.update({ where: { id }, data: { role }, select: userPublicSelect });
    return updated;
  }

  // --------------------------------------------------------------------------
  // Agents
  // --------------------------------------------------------------------------

  async agentsList(query: AdminAgentQueryDto) {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.AgentProfileWhereInput = {};
    if (query.verificationStatus) where.verificationStatus = query.verificationStatus;
    if (query.search) {
      where.OR = [
        { agencyName: { contains: query.search, mode: 'insensitive' } },
        { licenseNumber: { contains: query.search, mode: 'insensitive' } },
        { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.agentProfile.findMany({
        where,
        include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true, isActive: true } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.agentProfile.count({ where }),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  async agentFindOne(id: string) {
    const agent = await this.prisma.agentProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true, fullName: true, email: true, phone: true, avatarUrl: true, isActive: true } } },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    return agent;
  }

  async updateAgentVerification(actorId: string, id: string, status: AgentVerificationStatus, ip?: string) {
    const agent = await this.prisma.agentProfile.findUnique({
      where: { id },
      include: { user: { select: { id: true } } },
    });
    if (!agent) throw new NotFoundException('Agent not found');
    const updated = await this.prisma.agentProfile.update({
      where: { id },
      data: {
        verificationStatus: status,
        verifiedAt: status === AgentVerificationStatus.VERIFIED ? new Date() : null,
      },
      include: { user: { select: { id: true, fullName: true, email: true, avatarUrl: true } } },
    });
    const message =
      status === AgentVerificationStatus.VERIFIED
        ? 'Congratulations! Your agent profile has been verified.'
        : status === AgentVerificationStatus.REJECTED
          ? 'Your agent verification was rejected. Please contact support.'
          : 'Your verification status was updated to pending.';
    await this.notifications.notify(agent.user.id, NotificationType.AGENT, 'Agent verification update', message, { agentId: id });
    return updated;
  }

  // --------------------------------------------------------------------------
  // Properties
  // --------------------------------------------------------------------------

  async propertiesList(query: AdminPropertyQueryDto) {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.PropertyWhereInput = { deletedAt: null };
    if (query.status) where.status = query.status;
    if (query.agentId) where.agentId = query.agentId;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { neighborhood: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    const [items, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        include: propertyPublicInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.property.count({ where }),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  async propertyFindOne(id: string) {
    const property = await this.prisma.property.findFirst({
      where: { id },
      include: propertyPublicInclude,
    });
    if (!property) throw new NotFoundException('Property not found');
    return property;
  }

  async approveProperty(actorId: string, id: string, ip?: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: { agent: { include: { user: { select: { id: true } } } } },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.status !== PropertyStatus.PENDING_APPROVAL) {
      throw new ConflictException('Only pending listings can be approved');
    }
    const updated = await this.prisma.property.update({
      where: { id },
      data: { status: PropertyStatus.PUBLISHED, publishedAt: new Date(), rejectionReason: null },
      include: propertyPublicInclude,
    });
    await this.notifications.notify(
      property.agent.user.id,
      NotificationType.PROPERTY,
      'Listing approved',
      `Your listing "${property.title}" has been approved and is now published.`,
      { propertyId: id },
    );
    return updated;
  }

  async rejectProperty(actorId: string, id: string, reason: string, ip?: string) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: { agent: { include: { user: { select: { id: true } } } } },
    });
    if (!property) throw new NotFoundException('Property not found');
    if (property.status !== PropertyStatus.PENDING_APPROVAL) {
      throw new ConflictException('Only pending listings can be rejected');
    }
    const updated = await this.prisma.property.update({
      where: { id },
      data: { status: PropertyStatus.REJECTED, rejectionReason: reason },
      include: propertyPublicInclude,
    });
    await this.notifications.notify(
      property.agent.user.id,
      NotificationType.PROPERTY,
      'Listing rejected',
      `Your listing "${property.title}" was rejected. Reason: ${reason}`,
      { propertyId: id },
    );
    return updated;
  }

  async setFeatured(id: string, isFeatured: boolean) {
    const property = await this.prisma.property.findUnique({ where: { id }, select: { id: true, title: true } });
    if (!property) throw new NotFoundException('Property not found');
    return this.prisma.property.update({
      where: { id },
      data: { isFeatured },
      include: propertyPublicInclude,
    });
  }

  async updatePropertyStatus(id: string, status: PropertyStatus) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property) throw new NotFoundException('Property not found');
    if (!canTransition(property.status, status)) {
      throw new ConflictException(
        `Cannot transition property from ${property.status} to ${status}`,
      );
    }
    const data: Prisma.PropertyUpdateInput = { status };
    if (status === PropertyStatus.PUBLISHED && !property.publishedAt) {
      data.publishedAt = new Date();
    }
    if (status !== PropertyStatus.PUBLISHED) {
      // keep publishedAt; clearing rejection reason when leaving REJECTED
      if (property.status === PropertyStatus.REJECTED) data.rejectionReason = null;
    }
    return this.prisma.property.update({
      where: { id },
      data,
      include: propertyPublicInclude,
    });
  }

  // --------------------------------------------------------------------------
  // Inquiries / Appointments / Reviews (list-only)
  // --------------------------------------------------------------------------

  async inquiriesList(query: PaginationDto) {
    const page = query.pageValue;
    const limit = query.limitValue;
    const [items, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        include: { property: { select: { id: true, title: true, slug: true } }, agent: { include: { user: { select: { id: true, fullName: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inquiry.count(),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  async appointmentsList(query: PaginationDto) {
    const page = query.pageValue;
    const limit = query.limitValue;
    const [items, total] = await Promise.all([
      this.prisma.appointment.findMany({
        include: { property: { select: { id: true, title: true, slug: true } }, user: { select: { id: true, fullName: true } }, agent: { include: { user: { select: { id: true, fullName: true } } } } },
        orderBy: { scheduledAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count(),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  async reviewsList(query: PaginationDto) {
    const page = query.pageValue;
    const limit = query.limitValue;
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        include: { user: { select: { id: true, fullName: true } }, agent: { include: { user: { select: { id: true, fullName: true } } } } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count(),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }
}
