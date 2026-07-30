import { Injectable } from '@nestjs/common';
import type { Banner, BannerPosition, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { notDeleted } from '../../prisma/soft-delete.util';

@Injectable()
export class BannersRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Currently-live banners for the storefront: active, within their scheduling window
   * (or unscheduled), optionally filtered to one placement. */
  listLive(position?: BannerPosition): Promise<Banner[]> {
    const now = new Date();
    return this.prisma.banner.findMany({
      where: notDeleted({
        isActive: true,
        ...(position ? { position } : {}),
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      }),
      orderBy: { sortOrder: 'asc' },
    });
  }

  /** Every non-deleted banner regardless of active/scheduling status — backs admin management. */
  listAll(): Promise<Banner[]> {
    return this.prisma.banner.findMany({
      where: notDeleted(),
      orderBy: [{ position: 'asc' }, { sortOrder: 'asc' }],
    });
  }

  findById(id: string): Promise<Banner | null> {
    return this.prisma.banner.findFirst({ where: notDeleted({ id }) });
  }

  create(data: Prisma.BannerUncheckedCreateInput): Promise<Banner> {
    return this.prisma.banner.create({ data });
  }

  update(id: string, data: Prisma.BannerUncheckedUpdateInput): Promise<Banner> {
    return this.prisma.banner.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Banner> {
    return this.prisma.banner.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
