import { Injectable } from '@nestjs/common';
import type { Brand, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { notDeleted } from '../../prisma/soft-delete.util';
import type { ListBrandsQueryDto } from './dto/list-brands-query.dto';

@Injectable()
export class BrandsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListBrandsQueryDto) {
    const where: Prisma.BrandWhereInput = notDeleted({
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' } }
        : {}),
    });

    const [data, total] = await Promise.all([
      this.prisma.brand.findMany({
        where,
        orderBy: { name: 'asc' },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.prisma.brand.count({ where }),
    ]);

    return { data, total };
  }

  findById(id: string) {
    return this.prisma.brand.findFirst({ where: notDeleted({ id }) });
  }

  findBySlug(slug: string) {
    return this.prisma.brand.findFirst({ where: notDeleted({ slug }) });
  }

  findBySlugExcludingId(slug: string, excludeId?: string) {
    return this.prisma.brand.findFirst({
      where: notDeleted({
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      }),
    });
  }

  create(data: Prisma.BrandUncheckedCreateInput): Promise<Brand> {
    return this.prisma.brand.create({ data });
  }

  update(id: string, data: Prisma.BrandUncheckedUpdateInput): Promise<Brand> {
    return this.prisma.brand.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy: string): Promise<Brand> {
    return this.prisma.brand.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    });
  }
}
