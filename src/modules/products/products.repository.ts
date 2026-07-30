import { Injectable } from '@nestjs/common';
import type { Prisma, ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { notDeleted, withTrashed } from '../../prisma/soft-delete.util';
import { slugify } from '../../utils/slugify.util';
import type { ProductVariantDto } from './dto/product-variant.dto';

export interface ListProductsFilter {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  brandId?: string;
  tag?: string;
  status?: ProductStatus;
  minPrice?: number;
  maxPrice?: number;
  isTrending?: boolean;
  isFeatured?: boolean;
  isBestSeller?: boolean;
  sortBy?: 'newest' | 'price' | 'title';
  order?: 'asc' | 'desc';
}

const LIST_INCLUDE = {
  category: { select: { id: true, name: true, slug: true } },
  brand: { select: { id: true, name: true, slug: true } },
  images: {
    where: { deletedAt: null },
    orderBy: { sortOrder: 'asc' as const },
    take: 1,
  },
} satisfies Prisma.ProductInclude;

const DETAIL_INCLUDE = {
  category: true,
  brand: true,
  images: {
    where: { deletedAt: null },
    orderBy: { sortOrder: 'asc' as const },
  },
  variants: {
    where: { deletedAt: null },
    include: {
      attributeValues: {
        include: { attributeValue: { include: { attribute: true } } },
      },
    },
  },
  tags: { include: { tag: true } },
} satisfies Prisma.ProductInclude;

@Injectable()
export class ProductsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ListProductsFilter) {
    const where = this.buildWhere(filter);
    const orderBy: Prisma.ProductOrderByWithRelationInput =
      filter.sortBy === 'price'
        ? { minPrice: filter.order ?? 'asc' }
        : filter.sortBy === 'title'
          ? { title: filter.order ?? 'asc' }
          : { createdAt: filter.order ?? 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
        include: LIST_INCLUDE,
      }),
      this.prisma.product.count({ where }),
    ]);

    return { data, total };
  }

  private buildWhere(filter: ListProductsFilter): Prisma.ProductWhereInput {
    return notDeleted({
      ...(filter.categoryId ? { categoryId: filter.categoryId } : {}),
      ...(filter.brandId ? { brandId: filter.brandId } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.tag ? { tags: { some: { tag: { name: filter.tag } } } } : {}),
      ...(filter.isTrending !== undefined
        ? { isTrending: filter.isTrending }
        : {}),
      ...(filter.isFeatured !== undefined
        ? { isFeatured: filter.isFeatured }
        : {}),
      ...(filter.isBestSeller !== undefined
        ? { isBestSeller: filter.isBestSeller }
        : {}),
      ...(filter.minPrice !== undefined || filter.maxPrice !== undefined
        ? {
            minPrice: {
              ...(filter.minPrice !== undefined
                ? { gte: filter.minPrice }
                : {}),
              ...(filter.maxPrice !== undefined
                ? { lte: filter.maxPrice }
                : {}),
            },
          }
        : {}),
      ...(filter.search
        ? {
            OR: [
              {
                title: {
                  contains: filter.search,
                  mode: 'insensitive' as const,
                },
              },
              {
                description: {
                  contains: filter.search,
                  mode: 'insensitive' as const,
                },
              },
            ],
          }
        : {}),
    });
  }

  findBySlug(slug: string) {
    return this.prisma.product.findFirst({
      where: notDeleted({ slug }),
      include: DETAIL_INCLUDE,
    });
  }

  findById(id: string) {
    return this.prisma.product.findFirst({
      where: notDeleted({ id }),
      include: DETAIL_INCLUDE,
    });
  }

  /** Variant + its parent product's id/title/slug/status — the minimal shape Cart/Orders
   * need to validate a variant is sellable and to snapshot title/sku onto an OrderItem,
   * without pulling in the full DETAIL_INCLUDE (images/tags/all variants). */
  findVariantById(variantId: string) {
    return this.prisma.productVariant.findFirst({
      where: { id: variantId, deletedAt: null },
      include: {
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });
  }

  /** Full-detail rows for every active product — backs CSV export, not paginated since an
   * admin export is expected to cover the whole catalog in one file. */
  findAllForExport() {
    return this.prisma.product.findMany({
      where: notDeleted(),
      include: DETAIL_INCLUDE,
    });
  }

  findTrashedById(id: string) {
    return this.prisma.product.findFirst({ where: withTrashed({ id }) });
  }

  findBySlugExcludingId(slug: string, excludeId?: string) {
    return this.prisma.product.findFirst({
      where: notDeleted({
        slug,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      }),
    });
  }

  findSkuExcludingVariant(sku: string, excludeVariantId?: string) {
    return this.prisma.productVariant.findFirst({
      where: notDeleted({
        sku,
        ...(excludeVariantId ? { id: { not: excludeVariantId } } : {}),
      }),
    });
  }

  /** Upserts a Tag row per name and returns their ids — freeform tagging, no separate "create
   * tag first" step for admins (mirrors how most CMS product taggers work). */
  async upsertTagsByNames(names: string[]): Promise<string[]> {
    const ids: string[] = [];
    for (const name of names) {
      const slug = slugify(name);
      const tag = await this.prisma.tag.upsert({
        where: { name },
        create: { name, slug },
        update: {},
      });
      ids.push(tag.id);
    }
    return ids;
  }

  async createWithVariants(
    data: Prisma.ProductUncheckedCreateInput,
    variants: ProductVariantDto[],
    tagIds: string[],
    currentUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({ data });

      for (const variant of variants) {
        const created = await tx.productVariant.create({
          data: this.toVariantCreateData(variant, product.id, currentUserId),
        });
        if (variant.attributeValueIds?.length) {
          await tx.productVariantAttributeValue.createMany({
            data: variant.attributeValueIds.map((attributeValueId) => ({
              variantId: created.id,
              attributeValueId,
            })),
          });
        }
      }

      if (tagIds.length) {
        await tx.productTag.createMany({
          data: tagIds.map((tagId) => ({ productId: product.id, tagId })),
        });
      }

      await this.recomputeMinPrice(tx, product.id);
      return tx.product.findUniqueOrThrow({
        where: { id: product.id },
        include: DETAIL_INCLUDE,
      });
    });
  }

  async updateProduct(
    id: string,
    topLevel: Prisma.ProductUncheckedUpdateInput,
    variants: ProductVariantDto[] | undefined,
    tagIds: string[] | undefined,
    currentUserId: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      if (Object.keys(topLevel).length > 0) {
        await tx.product.update({ where: { id }, data: topLevel });
      }

      if (variants) {
        await this.syncVariants(tx, id, variants, currentUserId);
      }

      if (tagIds) {
        await tx.productTag.deleteMany({ where: { productId: id } });
        if (tagIds.length) {
          await tx.productTag.createMany({
            data: tagIds.map((tagId) => ({ productId: id, tagId })),
          });
        }
      }

      await this.recomputeMinPrice(tx, id);
      return tx.product.findUniqueOrThrow({
        where: { id },
        include: DETAIL_INCLUDE,
      });
    });
  }

  private async syncVariants(
    tx: Prisma.TransactionClient,
    productId: string,
    variants: ProductVariantDto[],
    currentUserId: string,
  ): Promise<void> {
    const existing = await tx.productVariant.findMany({
      where: { productId, deletedAt: null },
      select: { id: true },
    });
    const incomingIds = new Set(variants.filter((v) => v.id).map((v) => v.id));
    const toSoftDelete = existing.filter((v) => !incomingIds.has(v.id));

    for (const v of toSoftDelete) {
      await tx.productVariant.update({
        where: { id: v.id },
        data: { deletedAt: new Date(), deletedBy: currentUserId },
      });
    }

    for (const variant of variants) {
      if (variant.id) {
        await tx.productVariant.update({
          where: { id: variant.id },
          data: this.toVariantUpdateData(variant, currentUserId),
        });
        await tx.productVariantAttributeValue.deleteMany({
          where: { variantId: variant.id },
        });
        if (variant.attributeValueIds?.length) {
          await tx.productVariantAttributeValue.createMany({
            data: variant.attributeValueIds.map((attributeValueId) => ({
              variantId: variant.id!,
              attributeValueId,
            })),
          });
        }
      } else {
        const created = await tx.productVariant.create({
          data: this.toVariantCreateData(variant, productId, currentUserId),
        });
        if (variant.attributeValueIds?.length) {
          await tx.productVariantAttributeValue.createMany({
            data: variant.attributeValueIds.map((attributeValueId) => ({
              variantId: created.id,
              attributeValueId,
            })),
          });
        }
      }
    }
  }

  private async recomputeMinPrice(
    tx: Prisma.TransactionClient,
    productId: string,
  ): Promise<void> {
    const agg = await tx.productVariant.aggregate({
      where: { productId, deletedAt: null },
      _min: { sellingPrice: true },
    });
    await tx.product.update({
      where: { id: productId },
      data: { minPrice: agg._min.sellingPrice },
    });
  }

  private toVariantCreateData(
    variant: ProductVariantDto,
    productId: string,
    currentUserId: string,
  ): Prisma.ProductVariantUncheckedCreateInput {
    return {
      productId,
      sku: variant.sku!,
      barcode: variant.barcode,
      mrp: variant.mrp,
      sellingPrice: variant.sellingPrice,
      costPrice: variant.costPrice,
      gstRatePct: variant.gstRatePct ?? 0,
      weightGrams: variant.weightGrams,
      lengthMm: variant.lengthMm,
      widthMm: variant.widthMm,
      heightMm: variant.heightMm,
      isDefault: variant.isDefault ?? false,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    };
  }

  private toVariantUpdateData(
    variant: ProductVariantDto,
    currentUserId: string,
  ): Prisma.ProductVariantUncheckedUpdateInput {
    return {
      sku: variant.sku,
      barcode: variant.barcode,
      mrp: variant.mrp,
      sellingPrice: variant.sellingPrice,
      costPrice: variant.costPrice,
      gstRatePct: variant.gstRatePct ?? 0,
      weightGrams: variant.weightGrams,
      lengthMm: variant.lengthMm,
      widthMm: variant.widthMm,
      heightMm: variant.heightMm,
      isDefault: variant.isDefault ?? false,
      updatedBy: currentUserId,
    };
  }

  softDelete(id: string, deletedBy: string) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    });
  }

  async restore(id: string) {
    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
  }

  addImage(
    productId: string,
    path: string,
    altText: string | undefined,
    isThumbnail: boolean,
    sortOrder: number,
  ) {
    return this.prisma.productImage.create({
      data: { productId, path, altText, isThumbnail, sortOrder },
    });
  }

  findImageById(id: string) {
    return this.prisma.productImage.findFirst({ where: notDeleted({ id }) });
  }

  removeImage(id: string) {
    return this.prisma.productImage.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  countImagesForProduct(productId: string) {
    return this.prisma.productImage.count({ where: notDeleted({ productId }) });
  }

  async unsetThumbnails(productId: string): Promise<void> {
    await this.prisma.productImage.updateMany({
      where: notDeleted({ productId, isThumbnail: true }),
      data: { isThumbnail: false },
    });
  }
}
