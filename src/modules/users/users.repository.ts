import { Injectable } from '@nestjs/common';
import type { Prisma, UserRole, UserStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { notDeleted, withTrashed } from '../../prisma/soft-delete.util';

export interface ListUsersFilter {
  page: number;
  limit: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sort?: string;
  order?: 'asc' | 'desc';
}

const SORTABLE_FIELDS = new Set([
  'createdAt',
  'firstName',
  'lastName',
  'email',
  'lastLoginAt',
]);

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  async list(filter: ListUsersFilter) {
    const where: Prisma.UserWhereInput = notDeleted({
      ...(filter.role ? { role: filter.role } : {}),
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.search
        ? {
            OR: [
              { email: { contains: filter.search, mode: 'insensitive' } },
              { firstName: { contains: filter.search, mode: 'insensitive' } },
              { lastName: { contains: filter.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    });

    const sortField =
      filter.sort && SORTABLE_FIELDS.has(filter.sort)
        ? filter.sort
        : 'createdAt';
    const orderBy = { [sortField]: filter.order ?? 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: (filter.page - 1) * filter.limit,
        take: filter.limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total };
  }

  findById(id: string) {
    return this.prisma.user.findFirst({ where: notDeleted({ id }) });
  }

  findByIdWithOverrides(id: string) {
    return this.prisma.user.findFirst({
      where: notDeleted({ id }),
      include: {
        permissions: { include: { permission: true } },
      },
    });
  }

  findIdsByRole(role: UserRole) {
    return this.prisma.user
      .findMany({ where: notDeleted({ role }), select: { id: true } })
      .then((rows) => rows.map((r) => r.id));
  }

  update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  softDelete(id: string, deletedBy: string) {
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy },
    });
  }

  async restore(id: string) {
    const existing = await this.prisma.user.findFirst({
      where: withTrashed({ id }),
    });
    if (!existing) return null;
    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });
  }

  findTrashedById(id: string) {
    return this.prisma.user.findFirst({ where: withTrashed({ id }) });
  }

  async replaceOverrides(
    userId: string,
    overrides: { permissionId: string; granted: boolean; createdBy: string }[],
  ) {
    await this.prisma.$transaction([
      this.prisma.userPermission.deleteMany({ where: { userId } }),
      ...(overrides.length
        ? [
            this.prisma.userPermission.createMany({
              data: overrides.map((o) => ({
                userId,
                permissionId: o.permissionId,
                granted: o.granted,
                createdBy: o.createdBy,
              })),
            }),
          ]
        : []),
    ]);
  }
}
