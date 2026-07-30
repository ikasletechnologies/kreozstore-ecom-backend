import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { UsersRepository } from '../users/users.repository';
import { RolesRepository } from './roles.repository';
import { UpdateRolePermissionsDto } from './dto/update-role-permissions.dto';

@Injectable()
export class RolesService {
  constructor(
    private readonly rolesRepository: RolesRepository,
    private readonly usersRepository: UsersRepository,
    private readonly permissionsService: PermissionsService,
    private readonly prisma: PrismaService,
  ) {}

  async list() {
    const roles = await this.rolesRepository.listWithCounts();
    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      label: r.label,
      description: r.description,
      permissionCount: r._count.permissions,
    }));
  }

  async findOne(id: string) {
    const role = await this.rolesRepository.findById(id);
    if (!role) throw new NotFoundException('Role not found');

    const allPermissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
    const assignedCodes = new Set(
      role.permissions.map((rp) => rp.permission.code),
    );

    const catalog = groupByModule(
      allPermissions.map((p) => ({
        id: p.id,
        code: p.code,
        module: p.module,
        action: p.action,
        description: p.description,
        assigned: assignedCodes.has(p.code),
      })),
    );

    return {
      id: role.id,
      name: role.name,
      label: role.label,
      description: role.description,
      editable: role.name !== 'SUPER_ADMIN',
      permissionsByModule: catalog,
    };
  }

  async updatePermissions(
    id: string,
    dto: UpdateRolePermissionsDto,
    currentUserId: string,
  ) {
    const role = await this.rolesRepository.findById(id);
    if (!role) throw new NotFoundException('Role not found');

    // Super Admin always carries the full catalog (see prisma/seed.ts) — editing it here
    // would let someone accidentally strip their own escape hatch out of the system.
    if (role.name === 'SUPER_ADMIN') {
      throw new ForbiddenException(
        "The Super Admin role's permissions cannot be edited",
      );
    }

    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: dto.permissionCodes } },
    });
    const unknown = dto.permissionCodes.filter(
      (c) => !permissions.some((p) => p.code === c),
    );
    if (unknown.length) {
      throw new BadRequestException(
        `Unknown permission code(s): ${unknown.join(', ')}`,
      );
    }

    await this.rolesRepository.replacePermissions(
      id,
      permissions.map((p) => p.id),
      currentUserId,
    );

    // Every user holding this role shares one cached resolution keyed by userId — a role
    // bundle change must not wait out the TTL for users currently on that role.
    const affectedUserIds = await this.usersRepository.findIdsByRole(role.name);
    await this.permissionsService.invalidateUsers(affectedUserIds);

    return this.findOne(id);
  }
}

function groupByModule<T extends { module: string }>(
  items: T[],
): Record<string, T[]> {
  const grouped: Record<string, T[]> = {};
  for (const item of items) {
    (grouped[item.module] ??= []).push(item);
  }
  return grouped;
}
