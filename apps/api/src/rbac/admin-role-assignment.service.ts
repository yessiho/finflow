import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../audit/audit.service.js';
import { nowInstant } from '../prisma/temporal.js';

@Injectable()
export class AdminRoleAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Get all active roles available for assignment.
   */
  async getAvailableRoles() {
    return this.prisma.client.orm.public.AdminRole.where({
      isActive: true,
    }).all();
  }

  /**
   * Get all active roles assigned to an administrator.
   */
  async getAdminRoles(adminId: number) {
    const admin =
      await this.prisma.client.orm.public.Admin.first({
        id: adminId,
      });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const assignments =
      await this.prisma.client.orm.public.AdminRoleAssignment.where({
        adminId,
        isActive: true,
      }).all();

    const roles = [];

    for (const assignment of assignments) {
      const role =
        await this.prisma.client.orm.public.AdminRole.first({
          id: assignment.roleId,
          isActive: true,
        });

      if (role) {
        roles.push({
          assignmentId: assignment.id,
          roleId: role.id,
          code: role.code,
          name: role.name,
          description: role.description,
          assignedAt: assignment.createdAt,
        });
      }
    }

    return roles;
  }

  /**
   * Check whether an administrator is an active SUPER_ADMIN.
   */
  private async isSuperAdmin(
    adminId: number,
  ): Promise<boolean> {
    const admin =
      await this.prisma.client.orm.public.Admin.first({
        id: adminId,
      });

    if (!admin || admin.status !== 'ACTIVE') {
      return false;
    }

    const roles = await this.getAdminRoles(adminId);

    return roles.some(
      (role) => role.code === 'SUPER_ADMIN',
    );
  }

  /**
   * Assign a role to an administrator.
   */
  async assignRole(
    adminId: number,
    roleId: number,
    performedByAdminId: number,
  ) {
    /*
     * ---------------------------------------------------------
     * Validate target administrator
     * ---------------------------------------------------------
     */
    const targetAdmin =
      await this.prisma.client.orm.public.Admin.first({
        id: adminId,
      });

    if (!targetAdmin) {
      throw new NotFoundException(
        'Target admin not found',
      );
    }

    if (targetAdmin.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Cannot assign a role to an inactive administrator',
      );
    }

    /*
     * ---------------------------------------------------------
     * Validate acting administrator
     * ---------------------------------------------------------
     */
    const actingAdmin =
      await this.prisma.client.orm.public.Admin.first({
        id: performedByAdminId,
      });

    if (!actingAdmin) {
      throw new NotFoundException(
        'Acting admin not found',
      );
    }

    if (actingAdmin.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Inactive administrators cannot assign roles',
      );
    }

    /*
     * ---------------------------------------------------------
     * Validate role
     * ---------------------------------------------------------
     */
    const role =
      await this.prisma.client.orm.public.AdminRole.first({
        id: roleId,
        isActive: true,
      });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    /*
     * ---------------------------------------------------------
     * SUPER_ADMIN protection
     *
     * Only an active SUPER_ADMIN can assign
     * the SUPER_ADMIN role.
     * ---------------------------------------------------------
     */
    if (role.code === 'SUPER_ADMIN') {
      const actingAdminIsSuperAdmin =
        await this.isSuperAdmin(
          performedByAdminId,
        );

      if (!actingAdminIsSuperAdmin) {
        throw new BadRequestException(
          'Only an active SUPER_ADMIN can assign the SUPER_ADMIN role',
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * Check existing assignment.
     * ---------------------------------------------------------
     */
    const existingAssignment =
      await this.prisma.client.orm.public.AdminRoleAssignment.first(
        {
          adminId,
          roleId,
        },
      );

    /*
     * ---------------------------------------------------------
     * Prevent duplicate active assignment.
     * ---------------------------------------------------------
     */
    if (existingAssignment?.isActive) {
      throw new BadRequestException(
        'This role is already assigned to the administrator',
      );
    }

    /*
     * ---------------------------------------------------------
     * Reactivate an existing inactive assignment.
     *
     * Prisma 8 requires .where() before .update().
     * ---------------------------------------------------------
     */
    if (existingAssignment) {
      const updatedAssignment =
        await this.prisma.client.orm.public.AdminRoleAssignment
          .where({
            id: existingAssignment.id,
          })
          .update({
            isActive: true,
            updatedAt: nowInstant(),
          });

      if (!updatedAssignment) {
        throw new BadRequestException(
          'Failed to reactivate role assignment',
        );
      }

      /*
       * -------------------------------------------------------
       * Audit role reactivation.
       * -------------------------------------------------------
       */
      await this.auditService.create({
        userId: performedByAdminId,
        action: 'ROLE_ASSIGNED',
        entity: 'AdminRoleAssignment',
        entityId: String(updatedAssignment.id),
        metadata: JSON.stringify({
          targetAdminId: adminId,
          roleId,
          roleCode: role.code,
          roleName: role.name,
          reactivated: true,
        }),
      });

      return {
        assignmentId: updatedAssignment.id,
        adminId,
        roleId,
        roleCode: role.code,
        roleName: role.name,
        isActive: true,
        reactivated: true,
      };
    }

    /*
     * ---------------------------------------------------------
     * Create a new role assignment.
     *
     * updatedAt is explicitly supplied because the generated
     * Prisma 8 contract currently requires it.
     * ---------------------------------------------------------
     */
    const assignment =
      await this.prisma.client.orm.public.AdminRoleAssignment.create(
        {
          adminId,
          roleId,
          isActive: true,
          updatedAt: nowInstant(),
        },
      );

    if (!assignment) {
      throw new BadRequestException(
        'Failed to create role assignment',
      );
    }

    /*
     * ---------------------------------------------------------
     * Audit new role assignment.
     * ---------------------------------------------------------
     */
    await this.auditService.create({
      userId: performedByAdminId,
      action: 'ROLE_ASSIGNED',
      entity: 'AdminRoleAssignment',
      entityId: String(assignment.id),
      metadata: JSON.stringify({
        targetAdminId: adminId,
        roleId,
        roleCode: role.code,
        roleName: role.name,
        reactivated: false,
      }),
    });

    return {
      assignmentId: assignment.id,
      adminId,
      roleId,
      roleCode: role.code,
      roleName: role.name,
      isActive: true,
      reactivated: false,
    };
  }

  /**
   * Remove an administrator's role.
   */
  async removeRole(
    adminId: number,
    roleId: number,
    performedByAdminId: number,
  ) {
    /*
     * ---------------------------------------------------------
     * Validate target administrator.
     * ---------------------------------------------------------
     */
    const targetAdmin =
      await this.prisma.client.orm.public.Admin.first({
        id: adminId,
      });

    if (!targetAdmin) {
      throw new NotFoundException(
        'Target admin not found',
      );
    }

    /*
     * ---------------------------------------------------------
     * Validate acting administrator.
     * ---------------------------------------------------------
     */
    const actingAdmin =
      await this.prisma.client.orm.public.Admin.first({
        id: performedByAdminId,
      });

    if (!actingAdmin) {
      throw new NotFoundException(
        'Acting admin not found',
      );
    }

    if (actingAdmin.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Inactive administrators cannot remove roles',
      );
    }

    /*
     * ---------------------------------------------------------
     * Find active assignment.
     * ---------------------------------------------------------
     */
    const assignment =
      await this.prisma.client.orm.public.AdminRoleAssignment.first(
        {
          adminId,
          roleId,
          isActive: true,
        },
      );

    if (!assignment) {
      throw new NotFoundException(
        'Active role assignment not found',
      );
    }

    /*
     * ---------------------------------------------------------
     * Get role.
     * ---------------------------------------------------------
     */
    const role =
      await this.prisma.client.orm.public.AdminRole.first({
        id: roleId,
        isActive: true,
      });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    /*
     * ---------------------------------------------------------
     * SUPER_ADMIN protection.
     *
     * Only an active SUPER_ADMIN can remove
     * a SUPER_ADMIN role.
     * ---------------------------------------------------------
     */
    if (role.code === 'SUPER_ADMIN') {
      const actingAdminIsSuperAdmin =
        await this.isSuperAdmin(
          performedByAdminId,
        );

      if (!actingAdminIsSuperAdmin) {
        throw new BadRequestException(
          'Only an active SUPER_ADMIN can remove the SUPER_ADMIN role',
        );
      }

      /*
       * -------------------------------------------------------
       * Find SUPER_ADMIN role.
       * -------------------------------------------------------
       */
      const superAdminRole =
        await this.prisma.client.orm.public.AdminRole.first({
          code: 'SUPER_ADMIN',
          isActive: true,
        });

      if (!superAdminRole) {
        throw new NotFoundException(
          'SUPER_ADMIN role not found',
        );
      }

      /*
       * -------------------------------------------------------
       * Find all active SUPER_ADMIN assignments.
       * -------------------------------------------------------
       */
      const activeSuperAdminAssignments =
        await this.prisma.client.orm.public.AdminRoleAssignment
          .where({
            roleId: superAdminRole.id,
            isActive: true,
          })
          .all();

      let activeSuperAdminCount = 0;

      /*
       * -------------------------------------------------------
       * Count only assignments belonging to ACTIVE admins.
       * -------------------------------------------------------
       */
      for (const superAdminAssignment of activeSuperAdminAssignments) {
        const admin =
          await this.prisma.client.orm.public.Admin.first({
            id: superAdminAssignment.adminId,
          });

        if (admin?.status === 'ACTIVE') {
          activeSuperAdminCount += 1;
        }
      }

      /*
       * -------------------------------------------------------
       * Never remove the final active SUPER_ADMIN.
       * -------------------------------------------------------
       */
      if (activeSuperAdminCount <= 1) {
        throw new BadRequestException(
          'Cannot remove the last active SUPER_ADMIN',
        );
      }
    }

    /*
     * ---------------------------------------------------------
     * Deactivate assignment.
     *
     * Prisma 8 requires .where() before .update().
     * ---------------------------------------------------------
     */
    const updatedAssignment =
      await this.prisma.client.orm.public.AdminRoleAssignment
        .where({
          id: assignment.id,
        })
        .update({
          isActive: false,
          updatedAt: nowInstant(),
        });

    if (!updatedAssignment) {
      throw new BadRequestException(
        'Failed to remove role assignment',
      );
    }

    /*
     * ---------------------------------------------------------
     * Audit role removal.
     * ---------------------------------------------------------
     */
    await this.auditService.create({
      userId: performedByAdminId,
      action: 'ROLE_REMOVED',
      entity: 'AdminRoleAssignment',
      entityId: String(updatedAssignment.id),
      metadata: JSON.stringify({
        targetAdminId: adminId,
        roleId,
        roleCode: role.code,
        roleName: role.name,
      }),
    });

    return {
      assignmentId: updatedAssignment.id,
      adminId,
      roleId,
      roleCode: role.code,
      roleName: role.name,
      isActive: false,
    };
  }
}