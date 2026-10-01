import {
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { RequirePermissions } from './rbac.decorator.js';
import { PERMISSION_CODES } from './rbac.constants.js';
import { RbacGuard } from './rbac.guard.js';
import { AdminRoleAssignmentService } from './admin-role-assignment.service.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    type?: string;
  };
}

@UseGuards(RbacGuard)
@Controller('admin')
export class AdminRoleAssignmentController {
  constructor(
    private readonly roleAssignmentService: AdminRoleAssignmentService,
  ) {}

  /**
   * Get all active roles available for assignment.
   *
   * Permission:
   * ROLE_VIEW
   */
  @Get('roles')
  @RequirePermissions(
    PERMISSION_CODES.ROLE_VIEW,
  )
  async getAvailableRoles() {
    return this.roleAssignmentService.getAvailableRoles();
  }

  /**
   * Get all active roles assigned to one administrator.
   *
   * Permission:
   * ROLE_VIEW
   */
  @Get(':adminId/roles')
  @RequirePermissions(
    PERMISSION_CODES.ROLE_VIEW,
  )
  async getAdminRoles(
    @Param('adminId', ParseIntPipe)
    adminId: number,
  ) {
    return this.roleAssignmentService.getAdminRoles(
      adminId,
    );
  }

  /**
   * Assign a role to an administrator.
   *
   * Permission:
   * ROLE_ASSIGN
   *
   * The acting administrator is taken from the
   * authenticated JWT. It is NOT supplied by the frontend.
   */
  @Post(':adminId/roles/:roleId')
  @RequirePermissions(
    PERMISSION_CODES.ROLE_ASSIGN,
  )
  async assignRole(
    @Param('adminId', ParseIntPipe)
    adminId: number,

    @Param('roleId', ParseIntPipe)
    roleId: number,

    @Req()
    request: AuthenticatedRequest,
  ) {
    const performedByAdminId =
      Number(request.user?.id);

    return this.roleAssignmentService.assignRole(
      adminId,
      roleId,
      performedByAdminId,
    );
  }

  /**
   * Remove/deactivate a role assignment.
   *
   * Permission:
   * ROLE_ASSIGN
   */
  @Delete(':adminId/roles/:roleId')
  @RequirePermissions(
    PERMISSION_CODES.ROLE_ASSIGN,
  )
  async removeRole(
    @Param('adminId', ParseIntPipe)
    adminId: number,

    @Param('roleId', ParseIntPipe)
    roleId: number,

    @Req()
    request: AuthenticatedRequest,
  ) {
    const performedByAdminId =
      Number(request.user?.id);

    return this.roleAssignmentService.removeRole(
      adminId,
      roleId,
      performedByAdminId,
    );
  }
}