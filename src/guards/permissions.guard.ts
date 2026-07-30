import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PermissionsService } from '../modules/permissions/permissions.service';

/** Runs after JwtAuthGuard/RolesGuard. Only enforces when a handler carries @Permissions(...). */
@Injectable()
export class PermissionsGuard {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionsService: PermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    const allowed = await this.permissionsService.hasAll(
      user.id,
      user.role,
      required,
    );
    if (!allowed) {
      throw new ForbiddenException('Insufficient permissions for this action');
    }
    return true;
  }
}
