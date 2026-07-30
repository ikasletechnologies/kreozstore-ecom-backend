import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Category, ProductStatus } from '@prisma/client';
import { slugify } from '../../utils/slugify.util';
import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';

export interface CategoryTreeNode extends Category {
  children: CategoryTreeNode[];
}

@Injectable()
export class CategoriesService {
  constructor(private readonly categoriesRepository: CategoriesRepository) {}

  async list(format: 'flat' | 'tree', status?: ProductStatus) {
    const categories = await this.categoriesRepository.findAll(status);
    return format === 'tree' ? buildTree(categories) : categories;
  }

  async getBySlug(slug: string) {
    const category = await this.categoriesRepository.findBySlug(slug);
    if (!category) throw new NotFoundException('Category not found');

    const ancestors: Category[] = [];
    let current = category;
    while (current.parentId) {
      const parent = await this.categoriesRepository.findById(current.parentId);
      if (!parent) break;
      ancestors.unshift(parent);
      current = parent;
    }

    return { ...category, breadcrumb: ancestors };
  }

  async create(
    dto: CreateCategoryDto,
    currentUserId: string,
  ): Promise<Category> {
    if (dto.parentId) {
      const parent = await this.categoriesRepository.findById(dto.parentId);
      if (!parent)
        throw new BadRequestException(
          'parentId does not reference an existing category',
        );
    }

    const slug = await this.uniqueSlug(dto.slug ?? dto.name);

    return this.categoriesRepository.create({
      name: dto.name,
      slug,
      description: dto.description,
      imagePath: dto.imagePath,
      parentId: dto.parentId,
      sortOrder: dto.sortOrder ?? 0,
      status: dto.status,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
      metaKeywords: dto.metaKeywords,
      ogImage: dto.ogImage,
      canonicalUrl: dto.canonicalUrl,
      createdBy: currentUserId,
      updatedBy: currentUserId,
    });
  }

  async update(
    id: string,
    dto: UpdateCategoryDto,
    currentUserId: string,
  ): Promise<Category> {
    const existing = await this.categoriesRepository.findById(id);
    if (!existing) throw new NotFoundException('Category not found');

    if (dto.parentId !== undefined && dto.parentId !== null) {
      if (dto.parentId === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      const parent = await this.categoriesRepository.findById(dto.parentId);
      if (!parent)
        throw new BadRequestException(
          'parentId does not reference an existing category',
        );
      if (await this.isDescendant(id, dto.parentId)) {
        throw new BadRequestException(
          'Cannot move a category under its own descendant',
        );
      }
    }

    let slug = existing.slug;
    if (dto.slug && dto.slug !== existing.slug) {
      slug = await this.uniqueSlug(dto.slug, id);
    }

    return this.categoriesRepository.update(id, {
      name: dto.name,
      slug,
      description: dto.description,
      imagePath: dto.imagePath,
      parentId: dto.parentId,
      sortOrder: dto.sortOrder,
      status: dto.status,
      metaTitle: dto.metaTitle,
      metaDescription: dto.metaDescription,
      metaKeywords: dto.metaKeywords,
      ogImage: dto.ogImage,
      canonicalUrl: dto.canonicalUrl,
      updatedBy: currentUserId,
    });
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    const existing = await this.categoriesRepository.findById(id);
    if (!existing) throw new NotFoundException('Category not found');

    const childCount = await this.categoriesRepository.countChildren(id);
    if (childCount > 0) {
      throw new ConflictException(
        'This category has subcategories — move or delete them first',
      );
    }

    await this.categoriesRepository.softDelete(id, currentUserId);
  }

  async reorder(
    dto: ReorderCategoriesDto,
    currentUserId: string,
  ): Promise<Category[]> {
    for (const item of dto.items) {
      if (item.parentId === item.id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
    }
    await this.categoriesRepository.reorder(dto.items, currentUserId);
    return this.categoriesRepository.findAll();
  }

  /** True if `candidateParentId` is `nodeId` or lives anywhere in `nodeId`'s subtree —
   * re-parenting onto a descendant would otherwise create a cycle in the tree. */
  private async isDescendant(
    nodeId: string,
    candidateParentId: string,
  ): Promise<boolean> {
    const all = await this.categoriesRepository.findAll();
    const byParent = new Map<string, Category[]>();
    for (const c of all) {
      if (!c.parentId) continue;
      const list = byParent.get(c.parentId) ?? [];
      list.push(c);
      byParent.set(c.parentId, list);
    }

    const stack = [...(byParent.get(nodeId) ?? [])];
    while (stack.length) {
      const node = stack.pop()!;
      if (node.id === candidateParentId) return true;
      stack.push(...(byParent.get(node.id) ?? []));
    }
    return false;
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
      await this.categoriesRepository.findBySlugExcludingId(
        candidate,
        excludeId,
      )
    ) {
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
    return candidate;
  }
}

function buildTree(categories: Category[]): CategoryTreeNode[] {
  const nodes = new Map<string, CategoryTreeNode>(
    categories.map((c) => [c.id, { ...c, children: [] }]),
  );
  const roots: CategoryTreeNode[] = [];

  for (const node of nodes.values()) {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
