import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes, randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { InjectQueue } from '@nestjs/bullmq';
import type { Queue } from 'bullmq';
import { stringify } from 'csv-stringify/sync';
import { MediaService } from '../media/media.service';
import { UploadConfigService } from '../../config/services/upload-config.service';
import { QUEUE_PRODUCT_IMPORT } from '../../queue/queue.constants';
import type { ProductImportJobData } from './product-import.processor';
import { slugify } from '../../utils/slugify.util';
import { ProductsRepository } from './products.repository';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { AddProductImageDto } from './dto/add-product-image.dto';
import type { PaginatedResult } from '../../common/types/paginated-result.interface';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
    private readonly mediaService: MediaService,
    private readonly uploadConfig: UploadConfigService,
    @InjectQueue(QUEUE_PRODUCT_IMPORT)
    private readonly importQueue: Queue<ProductImportJobData>,
  ) {}

  async list(query: ListProductsQueryDto): Promise<PaginatedResult<unknown>> {
    const { data, total } = await this.productsRepository.list({
      page: query.page,
      limit: query.limit,
      search: query.search,
      categoryId: query.categoryId,
      brandId: query.brandId,
      tag: query.tag,
      status: query.status,
      minPrice: query.minPrice,
      maxPrice: query.maxPrice,
      isTrending: query.isTrending,
      isFeatured: query.isFeatured,
      isBestSeller: query.isBestSeller,
      sortBy: query.sortBy,
      order: query.order,
    });

    return {
      data: data.map((p) => ({
        id: p.id,
        title: p.title,
        slug: p.slug,
        status: p.status,
        isTrending: p.isTrending,
        isFeatured: p.isFeatured,
        isBestSeller: p.isBestSeller,
        priceFrom: p.minPrice,
        thumbnail: p.images[0]?.path ?? null,
        category: p.category,
        brand: p.brand,
        createdAt: p.createdAt,
      })),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async getBySlug(slug: string) {
    const product = await this.productsRepository.findBySlug(slug);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async getById(id: string) {
    const product = await this.productsRepository.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  /** Used by Cart/Orders to validate a variant is sellable (published, not soft-deleted)
   * before adding it to a cart or snapshotting it onto an order. */
  async getSellableVariant(variantId: string) {
    const variant = await this.productsRepository.findVariantById(variantId);
    if (
      !variant ||
      variant.product.deletedAt ||
      variant.product.status !== 'PUBLISHED'
    ) {
      throw new NotFoundException('Product variant not found');
    }
    return variant;
  }

  async create(dto: CreateProductDto, currentUserId: string) {
    const slug = await this.uniqueSlug(dto.slug ?? dto.title);
    const variants = await this.resolveVariantSkus(slug, dto.variants);
    const tagIds = dto.tagNames?.length
      ? await this.productsRepository.upsertTagsByNames(dedupe(dto.tagNames))
      : [];

    return this.productsRepository.createWithVariants(
      {
        title: dto.title,
        slug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        status: dto.status ?? 'DRAFT',
        isTrending: dto.isTrending ?? false,
        isFeatured: dto.isFeatured ?? false,
        isBestSeller: dto.isBestSeller ?? false,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        metaKeywords: dto.metaKeywords,
        ogImage: dto.ogImage,
        canonicalUrl: dto.canonicalUrl,
        createdBy: currentUserId,
        updatedBy: currentUserId,
      },
      variants,
      tagIds,
      currentUserId,
    );
  }

  async update(id: string, dto: UpdateProductDto, currentUserId: string) {
    const existing = await this.productsRepository.findById(id);
    if (!existing) throw new NotFoundException('Product not found');

    let slug: string | undefined;
    if (dto.slug && dto.slug !== existing.slug) {
      slug = await this.uniqueSlug(dto.slug, id);
    }

    let variants;
    if (dto.variants) {
      const base = slug ?? existing.slug;
      variants = await this.resolveVariantSkus(base, dto.variants);
    }

    const tagIds = dto.tagNames
      ? dto.tagNames.length
        ? await this.productsRepository.upsertTagsByNames(dedupe(dto.tagNames))
        : []
      : undefined;

    return this.productsRepository.updateProduct(
      id,
      {
        title: dto.title,
        slug,
        description: dto.description,
        shortDescription: dto.shortDescription,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        status: dto.status,
        isTrending: dto.isTrending,
        isFeatured: dto.isFeatured,
        isBestSeller: dto.isBestSeller,
        metaTitle: dto.metaTitle,
        metaDescription: dto.metaDescription,
        metaKeywords: dto.metaKeywords,
        ogImage: dto.ogImage,
        canonicalUrl: dto.canonicalUrl,
        updatedBy: currentUserId,
      },
      variants,
      tagIds,
      currentUserId,
    );
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    const existing = await this.productsRepository.findById(id);
    if (!existing) throw new NotFoundException('Product not found');
    await this.productsRepository.softDelete(id, currentUserId);
  }

  async restore(id: string) {
    const existing = await this.productsRepository.findTrashedById(id);
    if (!existing) throw new NotFoundException('Product not found');
    if (!existing.deletedAt)
      throw new BadRequestException('Product is not deleted');
    return this.productsRepository.restore(id);
  }

  async addImage(
    productId: string,
    file: Express.Multer.File | undefined,
    dto: AddProductImageDto,
    currentUserId: string,
  ) {
    const product = await this.productsRepository.findById(productId);
    if (!product) throw new NotFoundException('Product not found');

    const uploaded = await this.mediaService.upload(
      file,
      'products',
      currentUserId,
      'Product',
      productId,
    );

    if (dto.isThumbnail) {
      await this.productsRepository.unsetThumbnails(productId);
    }

    const sortOrder =
      await this.productsRepository.countImagesForProduct(productId);
    return this.productsRepository.addImage(
      productId,
      uploaded.relativePath,
      dto.altText,
      dto.isThumbnail ?? false,
      sortOrder,
    );
  }

  async enqueueImport(
    file: Express.Multer.File | undefined,
    currentUserId: string,
  ): Promise<{ jobId: string }> {
    if (!file)
      throw new BadRequestException(
        'No file was uploaded (field name: "file")',
      );
    if (!file.originalname.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException('Only .csv files are accepted');
    }

    // Lands in uploads/temp/ first, per docs/12-UPLOAD-SYSTEM.md §1 — the processor deletes it
    // once the job finishes (success or failure); a daily sweep for anything orphaned is a
    // Phase 8 cron concern, not built here.
    const filePath = path.join(
      this.uploadConfig.rootPath,
      'temp',
      `${randomUUID()}.csv`,
    );
    await fs.writeFile(filePath, file.buffer);

    const job = await this.importQueue.add('import', {
      filePath,
      uploadedBy: currentUserId,
    });
    return { jobId: job.id! };
  }

  async exportCsv(): Promise<string> {
    const products = await this.productsRepository.findAllForExport();

    // One row per variant so a re-import round-trips — see ProductImportProcessor.
    const csvRows = products.flatMap((product) =>
      product.variants.map((variant) => ({
        title: product.title,
        slug: product.slug,
        categoryName: product.category.name,
        brandName: product.brand?.name ?? '',
        status: product.status,
        sku: variant.sku,
        mrp: variant.mrp.toString(),
        sellingPrice: variant.sellingPrice.toString(),
        costPrice: variant.costPrice.toString(),
        gstRatePct: variant.gstRatePct.toString(),
      })),
    );

    return stringify(csvRows, {
      header: true,
      columns: [
        'title',
        'slug',
        'categoryName',
        'brandName',
        'status',
        'sku',
        'mrp',
        'sellingPrice',
        'costPrice',
        'gstRatePct',
      ],
    });
  }

  async removeImage(productId: string, imageId: string): Promise<void> {
    const image = await this.productsRepository.findImageById(imageId);
    if (!image || image.productId !== productId) {
      throw new NotFoundException('Product image not found');
    }
    await this.productsRepository.removeImage(imageId);
  }

  private async uniqueSlug(
    source: string,
    excludeId?: string,
  ): Promise<string> {
    const base = slugify(source);
    if (!base)
      throw new BadRequestException(
        'Could not derive a slug from the given title',
      );

    let candidate = base;
    let suffix = 2;
    while (
      await this.productsRepository.findBySlugExcludingId(candidate, excludeId)
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }

  /** Fills in a generated SKU (`<slug>-<random>`) for any variant that didn't supply one,
   * and rejects a client-supplied SKU that already belongs to another variant. */
  private async resolveVariantSkus<T extends { id?: string; sku?: string }>(
    productSlugBase: string,
    variants: T[],
  ): Promise<T[]> {
    const resolved: T[] = [];
    for (const variant of variants) {
      if (variant.sku) {
        const clash = await this.productsRepository.findSkuExcludingVariant(
          variant.sku,
          variant.id,
        );
        if (clash) {
          throw new ConflictException(`SKU "${variant.sku}" is already in use`);
        }
        resolved.push(variant);
        continue;
      }

      let sku = this.generateSkuCandidate(productSlugBase);
      while (await this.productsRepository.findSkuExcludingVariant(sku)) {
        sku = this.generateSkuCandidate(productSlugBase);
      }
      resolved.push({ ...variant, sku });
    }
    return resolved;
  }

  private generateSkuCandidate(base: string): string {
    return `${base}-${randomBytes(3).toString('hex')}`.toUpperCase();
  }
}

function dedupe(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim()).filter(Boolean))];
}
