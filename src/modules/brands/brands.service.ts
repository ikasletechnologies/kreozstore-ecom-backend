import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Brand } from '@prisma/client';
import { slugify } from '../../utils/slugify.util';
import { BrandsRepository } from './brands.repository';
import { CreateBrandDto } from './dto/create-brand.dto';
import { UpdateBrandDto } from './dto/update-brand.dto';
import { ListBrandsQueryDto } from './dto/list-brands-query.dto';
import type { PaginatedResult } from '../../common/types/paginated-result.interface';

@Injectable()
export class BrandsService {
  constructor(private readonly brandsRepository: BrandsRepository) {}

  async list(query: ListBrandsQueryDto): Promise<PaginatedResult<Brand>> {
    const { data, total } = await this.brandsRepository.list(query);
    return {
      data,
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async getBySlug(slug: string): Promise<Brand> {
    const brand = await this.brandsRepository.findBySlug(slug);
    if (!brand) throw new NotFoundException('Brand not found');
    return brand;
  }

  async create(dto: CreateBrandDto, currentUserId: string): Promise<Brand> {
    const slug = await this.uniqueSlug(dto.slug ?? dto.name);
    return this.brandsRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      logoPath: dto.logoPath,
      status: dto.status,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
      metaKeywords: dto.metaKeywords,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
  }

  async update(
    id: string,
    dto: UpdateBrandDto,
    currentUserId: string,
  ): Promise<Brand> {
    const existing = await this.brandsRepository.findById(id);
    if (!existing) throw new NotFoundException('Brand not found');

    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      slug = await this.uniqueSlug(dto.slug, id);
    }

    return this.brandsRepository.update(id, {
      name: dto.name,
      slug,
      description: dto.description,
      logoPath: dto.logoPath,
      status: dto.status,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
      metaKeywords: dto.metaKeywords,
      updatedBy: currentUserId,
    });
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    const existing = await this.brandsRepository.findById(id);
    if (!existing) throw new NotFoundException('Brand not found');
    await this.brandsRepository.softDelete(id, currentUserId);
  }

  private async uniqueSlug(
    source: string,
    excludeId?: string,
  ): Promise<string> {
    const base = slugify(source);
    if (!base)
      throw new BadRequestException(
        'Could not derive a slug from the given name',
      );

    let candidate = base;
    let suffix = 2;
    while (
      await this.brandsRepository.findBySlugExcludingId(candidate, excludeId)
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}
