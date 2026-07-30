import { Injectable } from '@nestjs/common';
import type { Category, Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { notDeleted } from '../../prisma/soft-delete.util';

@Injectable()
export class CategoriesRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(status?: ProductStatus): Promise<Category[]> {
    return this.prisma.category.findMany({
      where: notDeleted(status ? { status } : {}),
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
  }

  findById(id: string) {
    return this.prisma.category.findFirst({ where: notDeleted({ id }) });
  }

  findBySlug(slug: string) {
    return this.prisma.category.findFirst({ where: notDeleted({ slug }) });
  }

  findBySlugExcludingId(slug: string, excludeId?: string) {
    return this.prisma.category.findFirst({
      where: notDeleted({
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      }),
    });
  }

  countChildren(id: string): Promise<number> {
    return this.prisma.category.count({ where: notDeleted({ parentId: id }) });
  }

  create(data: Prisma.CategoryUncheckedCreateInput): Promise<Category> {
    return this.prisma.category.create({ data });
  }

  update(
    id: string,
    data: Prisma.CategoryUncheckedUpdateInput,
  ): Promise<Category> {
    return this.prisma.category.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy: string): Promise<Category> {
    return this.prisma.category.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    });
  }

  async reorder(
    items: { id: string; parentId?: string | null; sortOrder: number }[],
    updatedBy: string,
  ): Promise<void> {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.category.update({
          where: { id: item.id },
          data: {
            parentId: item.parentId,
            sortOrder: item.sortOrder,
            updatedBy,
          },
        }),
      ),
    );
  }
}
