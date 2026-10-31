import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PropertyStatus } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { buildPaginationMeta, Paginated } from '@/common/types/pagination';
import { propertyPublicInclude, PropertyPublic } from '@/properties/properties.service';
import { PaginationDto } from '@/common/dto/pagination.dto';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: PaginationDto): Promise<Paginated<PropertyPublic>> {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.FavoriteWhereInput = { userId };

    const [favorites, total] = await Promise.all([
      this.prisma.favorite.findMany({
        where,
        include: { property: { include: propertyPublicInclude } },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.favorite.count({ where }),
    ]);

    const items = favorites
      .map((f) => f.property)
      .filter((p): p is PropertyPublic => !!p && p.deletedAt === null) as PropertyPublic[];

    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  async add(userId: string, propertyId: string): Promise<{ id: string }> {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, deletedAt: null, status: PropertyStatus.PUBLISHED },
      select: { id: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found or not available to favorite');
    }

    const existing = await this.prisma.favorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Property is already in your favorites');
    }

    const favorite = await this.prisma.favorite.create({
      data: { userId, propertyId },
      select: { id: true },
    });
    return favorite;
  }

  async remove(userId: string, propertyId: string): Promise<void> {
    const existing = await this.prisma.favorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
    });
    if (!existing) {
      throw new NotFoundException('Favorite not found');
    }
    await this.prisma.favorite.delete({ where: { id: existing.id } });
  }

  async check(userId: string, propertyId: string): Promise<{ isFavorite: boolean }> {
    const favorite = await this.prisma.favorite.findUnique({
      where: { userId_propertyId: { userId, propertyId } },
      select: { id: true },
    });
    return { isFavorite: !!favorite };
  }
}
