import { Injectable } from '@nestjs/common';
import type { Address, AddressType, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { notDeleted, withTrashed } from '../../prisma/soft-delete.util';

@Injectable()
export class AddressesRepository {
  constructor(private readonly prisma: PrismaService) {}

  listByUser(userId: string): Promise<Address[]> {
    return this.prisma.address.findMany({
      where: notDeleted({ userId }),
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  findById(id: string): Promise<Address | null> {
    return this.prisma.address.findFirst({ where: notDeleted({ id }) });
  }

  /** Ignores deletedAt — an order may reference an address the customer later removed. */
  findByIdIncludingDeleted(id: string): Promise<Address | null> {
    return this.prisma.address.findFirst({ where: withTrashed({ id }) });
  }

  create(data: Prisma.AddressUncheckedCreateInput): Promise<Address> {
    return this.prisma.address.create({ data });
  }

  update(
    id: string,
    data: Prisma.AddressUncheckedUpdateInput,
  ): Promise<Address> {
    return this.prisma.address.update({ where: { id }, data });
  }

  async unsetOtherDefaults(
    userId: string,
    type: AddressType,
    excludeId?: string,
  ): Promise<void> {
    await this.prisma.address.updateMany({
      where: notDeleted({
        userId,
        type,
        ...(excludeId ? { id: { not: excludeId } } : {}),
      }),
      data: { isDefault: false },
    });
  }

  softDelete(id: string, deletedBy: string): Promise<Address> {
    return this.prisma.address.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    });
  }
}
