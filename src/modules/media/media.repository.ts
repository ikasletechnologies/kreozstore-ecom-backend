import { Injectable } from '@nestjs/common';
import type { MediaAsset, MediaType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { notDeleted } from '../../prisma/soft-delete.util';

export interface ListMediaFilter {
  page: number;
  limit: number;
  type?: MediaType;
  entityType?: string;
  entityId?: string;
}

@Injectable()
export class MediaRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ListMediaFilter) {
    const where: Prisma.MediaAssetWhereInput = notDeleted({
      ...(filter.type ? { type: filter.type } : {}),
      ...(filter.entityType ? { entityType: filter.entityType } : {}),
      ...(filter.entityId ? { entityId: filter.entityId } : {}),
    });

    const [data, total] = await Promise.all([
      this.prisma.mediaAsset.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.mediaAsset.count({ where }),
    ]);

    return { data, total };
  }

  findById(id: string) {
    return this.prisma.mediaAsset.findFirst({ where: notDeleted({ id }) });
  }

  create(data: Prisma.MediaAssetUncheckedCreateInput): Promise<MediaAsset> {
    return this.prisma.mediaAsset.create({ data });
  }

  softDelete(id: string): Promise<MediaAsset> {
    return this.prisma.mediaAsset.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
