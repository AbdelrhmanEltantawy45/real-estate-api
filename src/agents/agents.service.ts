import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AgentVerificationStatus,
  ListingType,
  Prisma,
  PropertyStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { ReviewsService } from '@/reviews/reviews.service';
import { buildPaginationMeta, Paginated } from '@/common/types/pagination';
import { propertyPublicInclude, PropertyPublic } from '@/properties/properties.service';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { AgentQueryDto } from './dto/agent-query.dto';
import { ApplyAgentDto, UpdateAgentProfileDto } from './dto/apply-agent.dto';

const agentPublicInclude = {
  user: { select: { id: true, fullName: true, avatarUrl: true, phone: true } },
} satisfies Prisma.AgentProfileInclude;

type AgentPublic = Prisma.AgentProfileGetPayload<{ include: typeof agentPublicInclude }>;

@Injectable()
export class AgentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reviews: ReviewsService,
  ) {}

  async findAll(query: AgentQueryDto): Promise<Paginated<AgentPublic & { averageRating: number; reviewCount: number; publishedListings: number }>> {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.AgentProfileWhereInput = {};
    if (query.verificationStatus) {
      where.verificationStatus = query.verificationStatus;
    } else {
      where.verificationStatus = AgentVerificationStatus.VERIFIED;
    }
    if (query.search) {
      where.OR = [
        { agencyName: { contains: query.search, mode: 'insensitive' } },
        { bio: { contains: query.search, mode: 'insensitive' } },
        { user: { fullName: { contains: query.search, mode: 'insensitive' } } },
      ];
    }

    const [agents, total] = await Promise.all([
      this.prisma.agentProfile.findMany({
        where,
        include: agentPublicInclude,
        orderBy: { verifiedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.agentProfile.count({ where }),
    ]);

    const ids = agents.map((a) => a.id);
    const [reviewAgg, listingCounts] = await Promise.all([
      this.prisma.review.groupBy({
        by: ['agentId'],
        where: { agentId: { in: ids } },
        _avg: { rating: true },
        _count: { _all: true },
      }),
      this.prisma.property.groupBy({
        by: ['agentId'],
        where: {
          agentId: { in: ids },
          status: PropertyStatus.PUBLISHED,
          deletedAt: null,
        },
        _count: { _all: true },
      }),
    ]);
    const reviewMap = new Map(reviewAgg.map((r) => [r.agentId, r] as const));
    const listingMap = new Map(
      listingCounts.map((l) => [l.agentId, l._count._all] as const),
    );

    const items = agents.map((a) => {
      const r = reviewMap.get(a.id);
      return {
        ...a,
        averageRating: r && r._avg.rating ? Number(r._avg.rating.toFixed(2)) : 0,
        reviewCount: r?._count._all ?? 0,
        publishedListings: listingMap.get(a.id) ?? 0,
      };
    });

    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  async findOne(id: string) {
    const agent = await this.prisma.agentProfile.findUnique({
      where: { id },
      include: agentPublicInclude,
    });
    if (!agent) throw new NotFoundException('Agent not found');
    const summary = await this.reviews.summary(id);
    const publishedListings = await this.prisma.property.count({
      where: { agentId: id, status: PropertyStatus.PUBLISHED, deletedAt: null },
    });
    return { ...agent, ...summary, publishedListings };
  }

  async findAgentProperties(id: string, query: PaginationDto & { listingType?: ListingType }) {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.PropertyWhereInput = {
      agentId: id,
      status: PropertyStatus.PUBLISHED,
      deletedAt: null,
    };
    if ((query as any).listingType) where.listingType = (query as any).listingType;

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
    return new Paginated(items as PropertyPublic[], buildPaginationMeta(total, page, limit));
  }

  async apply(userId: string, dto: ApplyAgentDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role !== UserRole.USER) {
      throw new ForbiddenException('Only regular users can apply to become an agent');
    }
    const existing = await this.prisma.agentProfile.findUnique({ where: { userId } });
    if (existing) throw new ConflictException('You already have an agent profile');

    const profile = await this.prisma.$transaction(async (tx) => {
      const created = await tx.agentProfile.create({
        data: {
          userId,
          agencyName: dto.agencyName?.trim() || null,
          bio: dto.bio?.trim() || null,
          licenseNumber: dto.licenseNumber?.trim() || null,
          specialties: dto.specialties ?? [],
          verificationStatus: AgentVerificationStatus.PENDING,
        },
      });
      await tx.user.update({ where: { id: userId }, data: { role: UserRole.AGENT } });
      return created;
    });
    return profile;
  }

  async getMyProfile(agentProfileId: string) {
    const agent = await this.prisma.agentProfile.findUnique({
      where: { id: agentProfileId },
      include: agentPublicInclude,
    });
    if (!agent) throw new NotFoundException('Agent profile not found');
    const counts = await this.prisma.property.groupBy({
      by: ['status'],
      where: { agentId: agentProfileId, deletedAt: null },
      _count: { _all: true },
    });
    const listingCounts = Object.fromEntries(
      counts.map((c) => [c.status, c._count._all]),
    ) as Record<PropertyStatus, number>;
    return { ...agent, listingCounts };
  }

  async updateMyProfile(agentProfileId: string, dto: UpdateAgentProfileDto) {
    await this.getMyProfile(agentProfileId);
    return this.prisma.agentProfile.update({
      where: { id: agentProfileId },
      data: {
        agencyName: dto.agencyName?.trim() || undefined,
        bio: dto.bio?.trim() || undefined,
        licenseNumber: dto.licenseNumber?.trim() || undefined,
        specialties: dto.specialties,
      },
      include: agentPublicInclude,
    });
  }
}
