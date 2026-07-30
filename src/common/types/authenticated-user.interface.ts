import type { UserRole } from '@prisma/client';

/** Shape attached to `req.user` by JwtStrategy once a request passes JwtAuthGuard. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}
