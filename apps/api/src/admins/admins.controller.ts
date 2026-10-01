import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { AdminsService } from './admins.service.js';
import { CreateAdminDto } from './dto/create-admin.dto.js';
import { RequirePermissions } from '../rbac/rbac.decorator.js';
import { PERMISSION_CODES } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';

interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    type?: string;
  };
}

@Controller('admins')
@UseGuards(RbacGuard)
export class AdminsController {
  constructor(private readonly adminsService: AdminsService) {}

  @Get()
  @RequirePermissions(PERMISSION_CODES.ADMIN_VIEW)
  async findAll() {
    return this.adminsService.findAll();
  }

  @Get(':id')
  @RequirePermissions(PERMISSION_CODES.ADMIN_VIEW)
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.adminsService.findOne(id);
  }

  @Post()
  @RequirePermissions(PERMISSION_CODES.ADMIN_CREATE)
  async create(
    @Body() createAdminDto: CreateAdminDto,
    @Req() request: AuthenticatedRequest,
  ) {
    const performedByAdminId = Number(request.user?.id);

    return this.adminsService.create(
      createAdminDto,
      performedByAdminId,
    );
  }

  @Patch(':id')
  @RequirePermissions(PERMISSION_CODES.ADMIN_UPDATE)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      email?: string;
      firstName?: string;
      lastName?: string;
    },
    @Req() request: AuthenticatedRequest,
  ) {
    const performedByAdminId = Number(request.user?.id);

    return this.adminsService.update(
      id,
      body,
      performedByAdminId,
    );
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSION_CODES.ADMIN_SUSPEND)
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: 'ACTIVE' | 'SUSPENDED' },
    @Req() request: AuthenticatedRequest,
  ) {
    const performedByAdminId = Number(request.user?.id);

    return this.adminsService.updateStatus(
      id,
      body.status,
      performedByAdminId,
    );
  }
}