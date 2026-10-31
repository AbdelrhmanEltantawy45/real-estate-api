import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ListingType,
  Prisma,
  PropertyStatus,
} from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import {
  buildPaginationMeta,
  Paginated,
} from '@/common/types/pagination';
import { uniqueSlug } from '@/common/utils/slug.util';
import { canTransition } from './utils/property-status';
import { PropertyQueryDto, PropertySort } from './dto/property-query.dto';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Relations included on every public-facing property payload. */
export const propertyPublicInclude = {
  images: { orderBy: [{ isPrimary: 'desc' }, { displayOrder: 'asc' }] },
  amenities: { select: { id: true, name: true, slug: true, category: true } },
  agent: {
    include: {
      user: { select: { id: true, fullName: true, avatarUrl: true } },
    },
  },
} satisfies Prisma.PropertyInclude;

export type PropertyPublic = Prisma.PropertyGetPayload<{
  include: typeof propertyPublicInclude;
}>;

/** Statuses an agent is allowed to set directly via the status endpoint. */
const AGENT_ALLOWED_TARGETS: PropertyStatus[] = [
  PropertyStatus.SOLD,
  PropertyStatus.RENTED,
  PropertyStatus.ARCHIVED,
  PropertyStatus.DRAFT,
];

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Public read APIs
  // --------------------------------------------------------------------------

  async findPublic(query: PropertyQueryDto): Promise<Paginated<PropertyPublic>> {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where = this.buildPublicWhere(query);

    const [items, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        include: propertyPublicInclude,
        orderBy: this.sortToOrderBy(query.sort ?? 'newest'),
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.property.count({ where }),
    ]);

    return new Paginated(items as PropertyPublic[], buildPaginationMeta(total, page, limit));
  }

  async findFeatured(limit = 12): Promise<Paginated<PropertyPublic>> {
    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      status: PropertyStatus.PUBLISHED,
      isFeatured: true,
    };
    const [items, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        include: propertyPublicInclude,
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 100),
      }),
      this.prisma.property.count({ where }),
    ]);
    return new Paginated(items as PropertyPublic[], buildPaginationMeta(total, 1, items.length));
  }

  async findRecent(limit = 12): Promise<Paginated<PropertyPublic>> {
    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      status: PropertyStatus.PUBLISHED,
    };
    const items = await this.prisma.property.findMany({
      where,
      include: propertyPublicInclude,
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 100),
    });
    return new Paginated(items as PropertyPublic[], buildPaginationMeta(items.length, 1, items.length));
  }

  async findOnePublic(idOrSlug: string): Promise<PropertyPublic> {
    const isUuid = UUID_RE.test(idOrSlug);
    const or: Prisma.PropertyWhereInput[] = isUuid
      ? [{ id: idOrSlug }, { slug: idOrSlug }]
      : [{ slug: idOrSlug }];
    const property = await this.prisma.property.findFirst({
      where: { OR: or, deletedAt: null, status: PropertyStatus.PUBLISHED },
      include: propertyPublicInclude,
    });
    if (!property) {
      throw new NotFoundException('Property not found or not available');
    }
    return property as PropertyPublic;
  }

  async recordView(propertyId: string, userId?: string): Promise<void> {
    const exists = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null, status: PropertyStatus.PUBLISHED },
      select: { id: true },
    });
    if (!exists) return;
    await this.prisma.propertyView.create({
      data: { propertyId, userId: userId ?? null },
    });
  }

  async getLocations() {
    const cities = await this.prisma.property.groupBy({
      by: ['city'],
      where: { deletedAt: null, status: PropertyStatus.PUBLISHED },
      _count: { _all: true },
      orderBy: { city: 'asc' },
    });
    return cities.map((c) => ({ city: c.city, count: c._count._all }));
  }

  async getPropertyTypes() {
    const types = await this.prisma.property.groupBy({
      by: ['propertyType'],
      where: { deletedAt: null, status: PropertyStatus.PUBLISHED },
      _count: { _all: true },
      orderBy: { propertyType: 'asc' },
    });
    return types.map((t) => ({ propertyType: t.propertyType, count: t._count._all }));
  }

  // --------------------------------------------------------------------------
  // Agent property management
  // --------------------------------------------------------------------------

  async createAgentProperty(
    agentProfileId: string,
    dto: CreatePropertyDto,
  ): Promise<PropertyPublic> {
    const amenityIds = await this.resolveAmenities(dto.amenityIds ?? []);
    const slug = await uniqueSlug(dto.title, async (candidate) => {
      const existing = await this.prisma.property.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      return !!existing;
    });

    const status =
      dto.status === PropertyStatus.PENDING_APPROVAL
        ? PropertyStatus.PENDING_APPROVAL
        : PropertyStatus.DRAFT;

    const property = await this.prisma.property.create({
      data: {
        title: dto.title.trim(),
        slug,
        description: dto.description,
        listingType: dto.listingType,
        propertyType: dto.propertyType.trim(),
        price: dto.price,
        currency: dto.currency?.toUpperCase() || 'SAR',
        area: dto.area,
        bedrooms: dto.bedrooms ?? 0,
        bathrooms: dto.bathrooms ?? 0,
        parkingSpaces: dto.parkingSpaces ?? 0,
        city: dto.city.trim(),
        neighborhood: dto.neighborhood?.trim() || null,
        address: dto.address?.trim() || null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        status,
        agentId: agentProfileId,
        amenities: amenityIds.length
          ? { connect: amenityIds.map((id) => ({ id })) }
          : undefined,
      },
      include: propertyPublicInclude,
    });
    return property as PropertyPublic;
  }

  async findAgentProperties(
    agentProfileId: string,
    query: PropertyQueryDto & { status?: PropertyStatus },
  ): Promise<Paginated<PropertyPublic>> {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.PropertyWhereInput = {
      agentId: agentProfileId,
      deletedAt: null,
    };
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { neighborhood: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.listingType) where.listingType = query.listingType;

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

  async findOneAgentProperty(
    agentProfileId: string,
    id: string,
  ): Promise<PropertyPublic> {
    const property = await this.prisma.property.findFirst({
      where: { id, agentId: agentProfileId, deletedAt: null },
      include: propertyPublicInclude,
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
    return property as PropertyPublic;
  }

  async updateAgentProperty(
    agentProfileId: string,
    id: string,
    dto: UpdatePropertyDto,
  ): Promise<PropertyPublic> {
    const existing = await this.findOneAgentProperty(agentProfileId, id);
    if (
      existing.status === PropertyStatus.PUBLISHED ||
      existing.status === PropertyStatus.SOLD ||
      existing.status === PropertyStatus.RENTED
    ) {
      throw new ConflictException(
        'Cannot edit a published/sold/rented listing. Move it to draft or archive first.',
      );
    }

    const amenityIds = dto.amenityIds
      ? await this.resolveAmenities(dto.amenityIds)
      : undefined;

    const property = await this.prisma.property.update({
      where: { id },
      data: {
        title: dto.title?.trim(),
        description: dto.description,
        listingType: dto.listingType,
        propertyType: dto.propertyType?.trim(),
        price: dto.price,
        currency: dto.currency?.toUpperCase(),
        area: dto.area,
        bedrooms: dto.bedrooms,
        bathrooms: dto.bathrooms,
        parkingSpaces: dto.parkingSpaces,
        city: dto.city?.trim(),
        neighborhood: dto.neighborhood?.trim() || undefined,
        address: dto.address?.trim() || undefined,
        latitude: dto.latitude,
        longitude: dto.longitude,
        amenities: amenityIds
          ? { set: amenityIds.map((aid) => ({ id: aid })) }
          : undefined,
      },
      include: propertyPublicInclude,
    });
    return property as PropertyPublic;
  }

  async softDeleteAgentProperty(agentProfileId: string, id: string): Promise<void> {
    const existing = await this.findOneAgentProperty(agentProfileId, id);
    if (existing.status === PropertyStatus.PUBLISHED) {
      throw new ConflictException('Archive the listing before deleting it');
    }
    await this.prisma.property.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async submitForApproval(agentProfileId: string, id: string): Promise<PropertyPublic> {
    const existing = await this.findOneAgentProperty(agentProfileId, id);
    const next = PropertyStatus.PENDING_APPROVAL;
    if (!canTransition(existing.status, next)) {
      throw new ConflictException(
        `Cannot submit a listing in ${existing.status} status`,
      );
    }
    const property = await this.prisma.property.update({
      where: { id },
      data: { status: next, rejectionReason: null },
      include: propertyPublicInclude,
    });
    return property as PropertyPublic;
  }

  async updateAgentStatus(
    agentProfileId: string,
    id: string,
    status: PropertyStatus,
  ): Promise<PropertyPublic> {
    const existing = await this.findOneAgentProperty(agentProfileId, id);
    if (!AGENT_ALLOWED_TARGETS.includes(status)) {
      throw new ForbiddenException(
        'Agents can only set a listing to SOLD, RENTED, ARCHIVED or DRAFT',
      );
    }
    if (!canTransition(existing.status, status)) {
      throw new ConflictException(
        `Cannot transition from ${existing.status} to ${status}`,
      );
    }
    const property = await this.prisma.property.update({
      where: { id },
      data: { status },
      include: propertyPublicInclude,
    });
    return property as PropertyPublic;
  }

  // --------------------------------------------------------------------------
  // Images (DB metadata only; the controller handles storage)
  // --------------------------------------------------------------------------

  async addImage(
    agentProfileId: string,
    propertyId: string,
    data: { imageUrl: string; storageKey: string; altText?: string; isPrimary?: boolean },
  ): Promise<PropertyPublic> {
    await this.findOneAgentProperty(agentProfileId, propertyId);
    return this.prisma.$transaction(async (tx) => {
      if (data.isPrimary) {
        await tx.propertyImage.updateMany({
          where: { propertyId },
          data: { isPrimary: false },
        });
      }
      await tx.propertyImage.create({
        data: {
          propertyId,
          imageUrl: data.imageUrl,
          storageKey: data.storageKey,
          altText: data.altText ?? null,
          isPrimary: data.isPrimary ?? false,
        },
      });
      return tx.property.findUnique({
        where: { id: propertyId },
        include: propertyPublicInclude,
      }) as Promise<PropertyPublic>;
    });
  }

  async removeImage(
    agentProfileId: string,
    propertyId: string,
    imageId: string,
  ): Promise<{ storageKey: string } | null> {
    await this.findOneAgentProperty(agentProfileId, propertyId);
    const image = await this.prisma.propertyImage.findFirst({
      where: { id: imageId, propertyId },
    });
    if (!image) throw new NotFoundException('Image not found');
    await this.prisma.propertyImage.delete({ where: { id: imageId } });
    return { storageKey: image.storageKey };
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private async resolveAmenities(ids: string[]): Promise<string[]> {
    if (!ids.length) return [];
    const unique = [...new Set(ids)];
    const found = await this.prisma.amenity.findMany({
      where: { id: { in: unique } },
      select: { id: true },
    });
    if (found.length !== unique.length) {
      const foundIds = new Set(found.map((a) => a.id));
      const missing = unique.filter((id) => !foundIds.has(id));
      throw new BadRequestException(`Invalid amenity ids: ${missing.join(', ')}`);
    }
    return unique;
  }

  private buildPublicWhere(query: PropertyQueryDto): Prisma.PropertyWhereInput {
    const where: Prisma.PropertyWhereInput = {
      deletedAt: null,
      status: PropertyStatus.PUBLISHED,
    };

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
        { city: { contains: query.search, mode: 'insensitive' } },
        { neighborhood: { contains: query.search, mode: 'insensitive' } },
      ];
    }
    if (query.listingType) where.listingType = query.listingType;
    if (query.propertyType) where.propertyType = query.propertyType;
    if (query.city) where.city = query.city;
    if (query.neighborhood) where.neighborhood = query.neighborhood;
    if (query.bedrooms) where.bedrooms = { gte: query.bedrooms };
    if (query.bathrooms) where.bathrooms = { gte: query.bathrooms };
    if (query.isFeatured !== undefined) where.isFeatured = query.isFeatured;

    const price: Prisma.DecimalFilter = {};
    if (query.minPrice !== undefined) price.gte = query.minPrice;
    if (query.maxPrice !== undefined) price.lte = query.maxPrice;
    if (Object.keys(price).length) where.price = price;

    const area: Prisma.DecimalFilter = {};
    if (query.minArea !== undefined) area.gte = query.minArea;
    if (query.maxArea !== undefined) area.lte = query.maxArea;
    if (Object.keys(area).length) where.area = area;

    const lat: Prisma.DecimalFilter = {};
    if (query.minLat !== undefined) lat.gte = query.minLat;
    if (query.maxLat !== undefined) lat.lte = query.maxLat;
    if (Object.keys(lat).length) where.latitude = lat;

    const lng: Prisma.DecimalFilter = {};
    if (query.minLng !== undefined) lng.gte = query.minLng;
    if (query.maxLng !== undefined) lng.lte = query.maxLng;
    if (Object.keys(lng).length) where.longitude = lng;

    if (query.amenities) {
      const slugs = query.amenities
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (slugs.length) {
        where.AND = slugs.map((slug) => ({ amenities: { some: { slug } } }));
      }
    }

    return where;
  }

  private sortToOrderBy(sort: PropertySort): Prisma.PropertyOrderByWithRelationInput[] {
    switch (sort) {
      case 'oldest':
        return [{ createdAt: 'asc' }];
      case 'price_asc':
        return [{ price: 'asc' }];
      case 'price_desc':
        return [{ price: 'desc' }];
      case 'relevance':
        return [{ isFeatured: 'desc' }, { createdAt: 'desc' }];
      case 'newest':
      default:
        return [{ createdAt: 'desc' }];
    }
  }
}

