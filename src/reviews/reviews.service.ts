import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { buildPaginationMeta, Paginated } from '@/common/types/pagination';
import { PaginationDto } from '@/common/dto/pagination.dto';
import { CreateReviewDto } from './dto/create-review.dto';

const reviewInclude = {
  user: { select: { id: true, fullName: true, avatarUrl: true } },
} satisfies Prisma.ReviewInclude;

type ReviewWithUser = Prisma.ReviewGetPayload<{ include: typeof reviewInclude }>;

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string, agentId: string, dto: CreateReviewDto): Promise<ReviewWithUser> {
    const agent = await this.prisma.agentProfile.findUnique({
      where: { id: agentId },
      include: { user: { select: { id: true } } },
    });
    if (!agent) throw new NotFoundException('Agent not found');

    const existing = await this.prisma.review.findUnique({
      where: { userId_agentId: { userId, agentId } },
    });
    if (existing) {
      throw new ConflictException('You have already reviewed this agent');
    }

    const [appointment, inquiry] = await Promise.all([
      this.prisma.appointment.findFirst({
        where: { userId, agentId },
        select: { id: true },
      }),
      this.prisma.inquiry.findFirst({
        where: { userId, agentId },
        select: { id: true },
      }),
    ]);
    if (!appointment && !inquiry) {
      throw new ForbiddenException(
        'You can only review agents you have interacted with',
      );
    }

    const review = await this.prisma.review.create({
      data: {
        userId,
        agentId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      },
      include: reviewInclude,
    });

    await this.notifications.notify(
      agent.user.id,
      NotificationType.REVIEW,
      'New agent review',
      `You received a ${dto.rating}-star review.`,
      { reviewId: review.id },
    );

    return review;
  }

  async findByAgent(agentId: string, query: PaginationDto): Promise<Paginated<ReviewWithUser>> {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.ReviewWhereInput = { agentId };

    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: reviewInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  async summary(agentId: string): Promise<{ averageRating: number; reviewCount: number }> {
    const agg = await this.prisma.review.aggregate({
      where: { agentId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    return {
      averageRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
      reviewCount: agg._count._all,
    };
  }

  async findAll(query: PaginationDto & { agentId?: string }) {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.ReviewWhereInput = {};
    if (query.agentId) where.agentId = query.agentId;
    const [items, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: reviewInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.review.count({ where }),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }
}
