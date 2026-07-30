import 'express';
import type { AuthenticatedUser } from './authenticated-user.interface';

declare module 'express-serve-static-core' {
  interface Request {
    correlationId?: string;
  }
}

// Passport's AuthGuard assigns `req.user` typed as the global `Express.User` interface.
declare global {
  namespace Express {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging target
    interface User extends AuthenticatedUser {}
  }
}
