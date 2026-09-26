import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import type { PermissionCode } from './rbac.constants.js';

@Injectable()
export class RbacService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async requireAdmin(adminId: number) {
    const admin =
      await this.prisma.client.orm.public.Admin.first({
        id: adminId,
      });

    if (!admin) {
      throw new NotFoundException(
        'Admin not found',
      );
    }

    if (admin.status !== 'ACTIVE') {
      throw new ForbiddenException(
        'Admin account is not active',
      );
    }

    return admin;
  }

  async getAdminPermissions(
    adminId: number,
  ): Promise<string[]> {
    await this.requireAdmin(adminId);

    const assignments =
      await this.prisma.client.orm.public.AdminRoleAssignment
        .where({
          adminId,
          isActive: true,
        })
        .all();

    if (assignments.length === 0) {
      return [];
    }

    const permissions = new Set<string>();

    for (const assignment of assignments) {
      const mappings =
        await this.prisma.client.orm.public.RolePermission
          .where({
            roleId: assignment.roleId,
            isActive: true,
          })
          .all();

      for (const mapping of mappings) {
        const permission =
          await this.prisma.client.orm.public.Permission.first({
            id: mapping.permissionId,
            isActive: true,
          });

        if (permission) {
          permissions.add(permission.code);
        }
      }
    }

    return [...permissions];
  }

  async hasPermission(
    adminId: number,
    permission: PermissionCode,
  ): Promise<boolean> {
    const permissions =
      await this.getAdminPermissions(adminId);

    return permissions.includes(permission);
  }

  async requirePermission(
    adminId: number,
    permission: PermissionCode,
  ): Promise<void> {
    const allowed =
      await this.hasPermission(
        adminId,
        permission,
      );

    if (!allowed) {
      throw new ForbiddenException(
        `Missing required permission: ${permission}`,
      );
    }
  }
}
