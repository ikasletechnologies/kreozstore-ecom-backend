import * as fs from 'node:fs/promises';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { parse } from 'csv-parse/sync';
import type { ProductStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_PRODUCT_IMPORT } from '../../queue/queue.constants';
import { ProductsService } from './products.service';

interface ProductImportRow {
  title: string;
  slug?: string;
  categoryName: string;
  brandName?: string;
  status?: string;
  sku?: string;
  mrp: string;
  sellingPrice: string;
  costPrice: string;
  gstRatePct?: string;
}

export interface ProductImportJobData {
  filePath: string;
  uploadedBy: string;
}

export interface ProductImportResult {
  created: number;
  failed: { row: number; error: string }[];
}

const CATALOG_STATUSES: ProductStatus[] = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

/** One job per uploaded CSV, one Product (with a single default variant) created per row —
 * see docs/17-BULLMQ-DESIGN.md's `product-import` row. Multi-variant-per-product import (many
 * rows sharing one product) is a documented future enhancement, not built now. */
@Processor(QUEUE_PRODUCT_IMPORT)
export class ProductImportProcessor extends WorkerHost {
  private readonly logger = new Logger(ProductImportProcessor.name);

  constructor(
    private readonly productsService: ProductsService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<ProductImportJobData>): Promise<ProductImportResult> {
    const { filePath, uploadedBy } = job.data;
    const csv = await fs.readFile(filePath, 'utf-8');
    const rows: ProductImportRow[] = parse(csv, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    let created = 0;
    const failed: { row: number; error: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const category = await this.prisma.category.findFirst({
          where: {
            deletedAt: null,
            OR: [
              { name: { equals: row.categoryName, mode: 'insensitive' } },
              { slug: row.categoryName },
            ],
          },
        });
        if (!category)
          throw new Error(`Category "${row.categoryName}" not found`);

        let brandId: string | undefined;
        if (row.brandName) {
          const brand = await this.prisma.brand.findFirst({
            where: {
              deletedAt: null,
              OR: [
                { name: { equals: row.brandName, mode: 'insensitive' } },
                { slug: row.brandName },
              ],
            },
          });
          brandId = brand?.id;
        }

        const status = CATALOG_STATUSES.includes(
          row.status?.toUpperCase() as ProductStatus,
        )
          ? (row.status!.toUpperCase() as ProductStatus)
          : 'DRAFT';

        await this.productsService.create(
          {
            title: row.title,
            slug: row.slug,
            categoryId: category.id,
            brandId,
            status,
            variants: [
              {
                sku: row.sku,
                mrp: Number(row.mrp),
                sellingPrice: Number(row.sellingPrice),
                costPrice: Number(row.costPrice),
                gstRatePct: row.gstRatePct ? Number(row.gstRatePct) : undefined,
              },
            ],
          },
          uploadedBy,
        );
        created += 1;
      } catch (error) {
        // +2: 1 for the header row, 1 to make it 1-indexed like a spreadsheet
        failed.push({
          row: i + 2,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    await fs.unlink(filePath).catch(() => undefined);

    // A SystemLog row would be the natural place to persist this for an admin viewer, but that
    // model doesn't exist yet — it's Phase 7 ("logs") scope. Logger output is the interim
    // record; the return value below is what the enqueuing request actually gets back.
    this.logger.log(
      `Product import finished: ${created} created, ${failed.length} failed`,
    );

    return { created, failed };
  }
}
