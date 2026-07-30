import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';
import { UsersRepository } from './users.repository';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateUserPermissionsDto } from './dto/update-user-permissions.dto';
import type { PaginatedResult } from '../../common/types/paginated-result.interface';

export interface SafeUser {
  id: string;
  email: string;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: User['role'];
  status: User['status'];
  lastLoginAt: Date | null;
  createdAt: Date;
}

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly permissionsService: PermissionsService,
    private readonly prisma: PrismaService,
  ) {}

  async list(query: ListUsersQueryDto): Promise<PaginatedResult<SafeUser>> {
    const { data, total } = await this.usersRepository.list({
      page: query.page,
      limit: query.limit,
      search: query.search,
      role: query.role,
      status: query.status,
      sort: query.sort,
      order: query.order,
    });

    return {
      data: data.map((u) => this.toSafeUser(u)),
      meta: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / query.limit)),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findByIdWithOverrides(id);
    if (!user) throw new NotFoundException('User not found');

    const effectivePermissions =
      await this.permissionsService.resolveEffectivePermissions(
        user.id,
        user.role,
      );

    return {
      ...this.toSafeUser(user),
      effectivePermissions,
      overrides: user.permissions.map((p) => ({
        permissionCode: p.permission.code,
        granted: p.granted,
      })),
    };
  }

  async update(
    id: string,
    dto: UpdateUserDto,
    currentUserId: string,
  ): Promise<SafeUser> {
    const existing = await this.usersRepository.findById(id);
    if (!existing) throw new NotFoundException('User not found');

    const isSelf = id === currentUserId;
    if (isSelf && dto.role && dto.role !== existing.role) {
      throw new ForbiddenException('You cannot change your own role');
    }
    if (isSelf && dto.status && dto.status !== 'ACTIVE') {
      throw new ForbiddenException('You cannot change your own account status');
    }

    const roleChanged = dto.role !== undefined && dto.role !== existing.role;

    const updated = await this.usersRepository.update(id, {
      firstName: dto.firstName,
      lastName: dto.lastName,
      phone: dto.phone,
      role: dto.role,
      status: dto.status,
      updatedBy: currentUserId,
    });

    // A role change moves the user to a different permission bundle — the cached resolution
    // (keyed by userId, see PermissionsService) must not serve the old role's set until TTL.
    if (roleChanged) {
      await this.permissionsService.invalidate(id);
    }

    return this.toSafeUser(updated);
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    if (id === currentUserId) {
      throw new ForbiddenException('You cannot delete your own account');
    }
    const existing = await this.usersRepository.findById(id);
    if (!existing) throw new NotFoundException('User not found');

    await this.usersRepository.softDelete(id, currentUserId);
  }

  async restore(id: string): Promise<SafeUser> {
    const existing = await this.usersRepository.findTrashedById(id);
    if (!existing) throw new NotFoundException('User not found');
    if (!existing.deletedAt) {
      throw new BadRequestException('User is not deleted');
    }

    const restored = await this.usersRepository.restore(id);
    if (!restored) throw new NotFoundException('User not found');
    return this.toSafeUser(restored);
  }

  async setPermissionOverrides(
    id: string,
    dto: UpdateUserPermissionsDto,
    currentUserId: string,
  ) {
    const user = await this.usersRepository.findById(id);
    if (!user) throw new NotFoundException('User not found');

    const codes = dto.overrides.map((o) => o.permissionCode);
    const permissions = await this.prisma.permission.findMany({
      where: { code: { in: codes } },
    });
    const byCode = new Map(permissions.map((p) => [p.code, p]));

    const unknown = codes.filter((c) => !byCode.has(c));
    if (unknown.length) {
      throw new BadRequestException(
        `Unknown permission code(s): ${unknown.join(', ')}`,
      );
    }

    await this.usersRepository.replaceOverrides(
      id,
      dto.overrides.map((o) => ({
        permissionId: byCode.get(o.permissionCode)!.id,
        granted: o.granted,
        createdBy: currentUserId,
      })),
    );

    await this.permissionsService.invalidate(id);
    return this.findOne(id);
  }

  private toSafeUser(user: User): SafeUser {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      status: user.status,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
    };
  }
}
