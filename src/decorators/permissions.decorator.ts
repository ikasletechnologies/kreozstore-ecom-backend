import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/** Requires every listed permission code (e.g. "products.create"), enforced by PermissionsGuard. */
export const Permissions = (
  ...codes: string[]
): MethodDecorator & ClassDecorator => SetMetadata(PERMISSIONS_KEY, codes);
