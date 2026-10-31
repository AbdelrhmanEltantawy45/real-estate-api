import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InquiryStatus, NotificationType, Prisma, PropertyStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { propertyPublicInclude } from '@/properties/properties.service';
import { buildPaginationMeta, Paginated } from '@/common/types/pagination';
import { canTransitionInquiry } from './utils/inquiry-status';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { InquiryStatusDto } from './dto/inquiry-status.dto';
import { InquiryQueryDto } from './dto/inquiry-query.dto';

const inquiryInclude = {
  property: { include: propertyPublicInclude },
  agent: {
    include: { user: { select: { id: true, fullName: true, avatarUrl: true } } },
  },
  user: { select: { id: true, fullName: true, email: true, phone: true } },
} satisfies Prisma.InquiryInclude;

type InquiryWithRelations = Prisma.InquiryGetPayload<{ include: typeof inquiryInclude }>;

@Injectable()
export class InquiriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(userId: string | undefined, dto: CreateInquiryDto): Promise<InquiryWithRelations> {
    const property = await this.prisma.property.findFirst({
      where: { id: dto.propertyId, deletedAt: null, status: PropertyStatus.PUBLISHED },
      include: { agent: { include: { user: true } } },
    });
    if (!property) {
      throw new NotFoundException('Property not found or not available');
    }
    if (!property.agent) {
      throw new NotFoundException('This property has no associated agent');
    }

    const inquiry = await this.prisma.inquiry.create({
      data: {
        userId: userId ?? null,
        agentId: property.agentId,
        propertyId: dto.propertyId,
        name: dto.name.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        message: dto.message.trim(),
        status: InquiryStatus.NEW,
      },
      include: inquiryInclude,
    });

    await this.notifications.notify(
      property.agent.userId,
      NotificationType.INQUIRY,
      'New property inquiry',
      `${dto.name} inquired about "${property.title}".`,
      { inquiryId: inquiry.id, propertyId: property.id },
    );

    return inquiry;
  }

  async myList(userId: string, query: InquiryQueryDto): Promise<Paginated<InquiryWithRelations>> {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.InquiryWhereInput = { userId };
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        where,
        include: inquiryInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inquiry.count({ where }),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  async agentList(agentProfileId: string, query: InquiryQueryDto): Promise<Paginated<InquiryWithRelations>> {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.InquiryWhereInput = { agentId: agentProfileId };
    if (query.status) where.status = query.status;

    const [items, total] = await Promise.all([
      this.prisma.inquiry.findMany({
        where,
        include: inquiryInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.inquiry.count({ where }),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  async agentFindOne(agentProfileId: string, id: string): Promise<InquiryWithRelations> {
    const inquiry = await this.prisma.inquiry.findUnique({
      where: { id },
      include: inquiryInclude,
    });
    if (!inquiry || inquiry.agentId !== agentProfileId) {
      throw new NotFoundException('Inquiry not found');
    }
    return inquiry;
  }

  async agentUpdateStatus(
    agentProfileId: string,
    id: string,
    dto: InquiryStatusDto,
  ): Promise<InquiryWithRelations> {
    const existing = await this.agentFindOne(agentProfileId, id);
    if (!canTransitionInquiry(existing.status, dto.status)) {
      throw new ConflictException(
        `Cannot transition inquiry from ${existing.status} to ${dto.status}`,
      );
    }
    return this.prisma.inquiry.update({
      where: { id },
      data: { status: dto.status },
      include: inquiryInclude,
    });
  }
}
