import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { notDeleted } from '../../prisma/soft-delete.util';

@Injectable()
export class RolesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async listWithCounts() {
    const roles = await this.prisma.role.findMany({
      where: notDeleted(),
      orderBy: { createdAt: 'asc' },
      include: { _count: { select: { permissions: true } } },
    });
    return roles;
  }

  findById(id: string) {
    return this.prisma.role.findFirst({
      where: notDeleted({ id }),
      include: { permissions: { include: { permission: true } } },
    });
  }

  async replacePermissions(
    roleId: string,
    permissionIds: string[],
    updatedBy: string,
  ): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.rolePermission.deleteMany({ where: { roleId } }),
      ...(permissionIds.length
        ? [
            this.prisma.rolePermission.createMany({
              data: permissionIds.map((permissionId) => ({
                roleId,
                permissionId,
              })),
              skipDuplicates: true,
            }),
          ]
        : []),
      this.prisma.role.update({
        where: { id: roleId },
        data: { updatedBy },
      }),
    ]);
  }
}
