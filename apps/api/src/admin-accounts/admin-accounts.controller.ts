import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermissions } from '../rbac/rbac.decorator.js';
import { PERMISSION_CODES } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';

import { AdminAccountsService } from './admin-accounts.service.js';

import { QueryAdminAccountsDto } from './dto/query-admin-accounts.dto.js';

import { UpdateAdminAccountStatusDto } from './dto/update-admin-account-status.dto.js';

interface AdminRequest extends Request {
  user?: {
    id: number | string;
    type?: string;
  };
}

@ApiTags('Admin Accounts')
@ApiBearerAuth('access-token')
@Controller('admin/accounts')
@UseGuards(RbacGuard)
export class AdminAccountsController {
  constructor(
    private readonly accountsService: AdminAccountsService,
  ) {}

  /**
   * GET /admin/accounts
   */
  @Get()
  @RequirePermissions(
    PERMISSION_CODES.ACCOUNT_VIEW,
  )
  @ApiOperation({
    summary:
      'List customer wallet accounts for administrators',
  })
  findAll(
    @Query()
    query: QueryAdminAccountsDto,
  ) {
    return this.accountsService.findAll(query);
  }

  /**
   * GET /admin/accounts/:id
   */
  @Get(':id')
  @RequirePermissions(
    PERMISSION_CODES.ACCOUNT_VIEW,
  )
  @ApiOperation({
    summary:
      'Get customer account details',
  })
  findOne(
    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.accountsService.findOne(id);
  }

  /**
   * PATCH /admin/accounts/:id/status
   */
  @Patch(':id/status')
  @RequirePermissions(
    PERMISSION_CODES.ACCOUNT_SUSPEND,
  )
  @ApiOperation({
    summary:
      'Change customer account status',
  })
  updateStatus(
    @Param('id', ParseIntPipe)
    id: number,

    @Body()
    body: UpdateAdminAccountStatusDto,

    @Req()
    request: AdminRequest,
  ) {
    const adminId = Number(
      request.user?.id,
    );

    return this.accountsService.updateStatus(
      id,
      body.status,
      adminId,
    );
  }
}