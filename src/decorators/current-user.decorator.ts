import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../common/types/authenticated-user.interface';

/** Extracts the authenticated user attached by JwtAuthGuard. Only valid behind that guard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.user as AuthenticatedUser;
  },
);
