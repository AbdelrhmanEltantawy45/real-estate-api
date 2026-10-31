import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/prisma/prisma.service';
import { buildPaginationMeta, Paginated } from '@/common/types/pagination';
import { slugify, uniqueSlug } from '@/common/utils/slug.util';
import { AmenityQueryDto } from './dto/amenity-query.dto';
import { CreateAmenityDto } from './dto/create-amenity.dto';
import { UpdateAmenityDto } from './dto/create-amenity.dto';

@Injectable()
export class AmenitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AmenityQueryDto) {
    const page = query.pageValue;
    const limit = query.limitValue;
    const where: Prisma.AmenityWhereInput = {};
    if (query.category) where.category = query.category;

    const [items, total] = await Promise.all([
      this.prisma.amenity.findMany({
        where,
        orderBy: [{ category: 'asc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.amenity.count({ where }),
    ]);
    return new Paginated(items, buildPaginationMeta(total, page, limit));
  }

  async create(dto: CreateAmenityDto) {
    const baseSlug = dto.slug?.trim() ? slugify(dto.slug) : slugify(dto.name);
    const slug = await uniqueSlug(baseSlug, async (candidate) => {
      const existing = await this.prisma.amenity.findUnique({ where: { slug: candidate } });
      return !!existing;
    });
    return this.prisma.amenity.create({
      data: { name: dto.name.trim(), slug, category: dto.category?.trim() || 'General' },
    });
  }

  async update(id: string, dto: UpdateAmenityDto) {
    await this.findOrFail(id);
    if (dto.slug && dto.slug.trim()) {
      const candidate = slugify(dto.slug);
      const clash = await this.prisma.amenity.findFirst({
        where: { slug: candidate, NOT: { id } },
      });
      if (clash) throw new ConflictException('Slug already in use');
    }
    return this.prisma.amenity.update({
      where: { id },
      data: {
        name: dto.name?.trim(),
        slug: dto.slug ? slugify(dto.slug) : undefined,
        category: dto.category?.trim() || undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOrFail(id);
    await this.prisma.amenity.delete({ where: { id } });
  }

  async findOrFail(id: string) {
    const amenity = await this.prisma.amenity.findUnique({ where: { id } });
    if (!amenity) throw new NotFoundException('Amenity not found');
    return amenity;
  }
}
