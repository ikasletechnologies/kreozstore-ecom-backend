import { SetMetadata } from '@nestjs/common';
import type { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';

/** Coarse role check, enforced by RolesGuard. Most endpoints should prefer @Permissions(). */
export const Roles = (...roles: UserRole[]): MethodDecorator & ClassDecorator =>
  SetMetadata(ROLES_KEY, roles);
