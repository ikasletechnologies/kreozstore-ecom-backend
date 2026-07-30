import { Injectable } from '@nestjs/common';
import type { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../redis/redis.service';

const CACHE_TTL_SECONDS = 10 * 60; // docs/09-AUTH-RBAC.md §4

/**
 * Resolves a user's effective permission set: their role's default bundle, plus/minus any
 * per-user UserPermission overrides — see docs/09-AUTH-RBAC.md §4 for the algorithm. Cached
 * in Redis for CACHE_TTL_SECONDS and explicitly invalidated by `invalidate()`, which the
 * roles/permissions admin module (Phase 2) will call on any RolePermission/UserPermission
 * write. The JWT-`permVersion` hard-invalidation layer described in the docs is deferred
 * until that module exists — until then, staleness is bounded by this cache's TTL, which the
 * docs themselves call the acceptable primary mechanism (permVersion is "belt-and-braces").
 */
@Injectable()
export class PermissionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async resolveEffectivePermissions(
    userId: string,
    role: UserRole,
  ): Promise<string[]> {
    const cacheKey = this.cacheKey(userId);
    const cached = await this.redis.getCache<string[]>(cacheKey);
    if (cached) return cached;

    const [rolePermissions, userOverrides] = await Promise.all([
      this.prisma.rolePermission.findMany({
        where: { role: { name: role } },
        select: { permission: { select: { code: true } } },
      }),
      this.prisma.userPermission.findMany({
        where: { userId },
        select: { granted: true, permission: { select: { code: true } } },
      }),
    ]);

    const effective = new Set(rolePermissions.map((rp) => rp.permission.code));
    for (const override of userOverrides) {
      if (override.granted) {
        effective.add(override.permission.code);
      } else {
        effective.delete(override.permission.code);
      }
    }

    const codes = [...effective];
    await this.redis.setCache(cacheKey, codes, CACHE_TTL_SECONDS);
    return codes;
  }

  async hasAll(
    userId: string,
    role: UserRole,
    required: string[],
  ): Promise<boolean> {
    if (required.length === 0) return true;
    const effective = await this.resolveEffectivePermissions(userId, role);
    const effectiveSet = new Set(effective);
    return required.every((code) => effectiveSet.has(code));
  }

  async invalidate(userId: string): Promise<void> {
    await this.redis.delCache(this.cacheKey(userId));
  }

  /** Bulk form of invalidate() — used when a role's permission bundle changes and every
   *  user holding that role needs their cached resolution dropped, not just one. */
  async invalidateUsers(userIds: string[]): Promise<void> {
    if (userIds.length === 0) return;
    await this.redis.delCache(userIds.map((id) => this.cacheKey(id)));
  }

  /** Full catalog, grouped by module — backs the role/user permission editor UIs. */
  async listCatalog(): Promise<
    Record<
      string,
      {
        code: string;
        module: string;
        action: string;
        description: string | null;
      }[]
    >
  > {
    const permissions = await this.prisma.permission.findMany({
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    });
    const grouped: Record<
      string,
      {
        code: string;
        module: string;
        action: string;
        description: string | null;
      }[]
    > = {};
    for (const p of permissions) {
      (grouped[p.module] ??= []).push({
        code: p.code,
        module: p.module,
        action: p.action,
        description: p.description,
      });
    }
    return grouped;
  }

  private cacheKey(userId: string): string {
    return `perms:${userId}`;
  }
}
