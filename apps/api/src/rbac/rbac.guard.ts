import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { Reflector } from '@nestjs/core';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

import {
  RBAC_PERMISSIONS_KEY,
} from './rbac.decorator.js';

import type { PermissionCode } from './rbac.constants.js';

import { RbacService } from './rbac.service.js';

@Injectable()
export class RbacGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
    private readonly jwtAuthGuard: JwtAuthGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authenticated = await this.jwtAuthGuard.canActivate(context);

    if (!authenticated) {
      return false;
    }

    const requiredPermissions =
      this.reflector.getAllAndOverride<PermissionCode[]>(
        RBAC_PERMISSIONS_KEY,
        [context.getHandler(), context.getClass()],
      );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    const user = request.user;

    if (!user || user.type !== 'ADMIN') {
      throw new ForbiddenException('Admin access required');
    }

    const adminId = Number(user.id);

    if (!Number.isInteger(adminId) || adminId <= 0) {
      throw new ForbiddenException('Invalid admin identity');
    }

    await this.rbacService.requireAdmin(adminId);

    /*
     * AND semantics:
     * an endpoint requiring multiple permissions requires ALL
     * permissions to be present.
     */
    for (const permission of requiredPermissions) {
      await this.rbacService.requirePermission(adminId, permission);
    }

    return true;
  }
}