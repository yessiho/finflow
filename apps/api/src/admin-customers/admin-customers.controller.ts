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
import { AdminCustomersService } from './admin-customers.service.js';
import { QueryAdminCustomersDto } from './dto/query-admin-customers.dto.js';

interface AdminRequest extends Request {
  user?: {
    id: number;
    type?: string;
  };
}

@ApiTags('Admin Customers')
@ApiBearerAuth('access-token')
@Controller('admin/customers')
@UseGuards(RbacGuard)
export class AdminCustomersController {
  constructor(
    private readonly customersService: AdminCustomersService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSION_CODES.CUSTOMER_VIEW)
  @ApiOperation({
    summary: 'List customers for administrators',
  })
  findAll(@Query() query: QueryAdminCustomersDto) {
    return this.customersService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSION_CODES.CUSTOMER_VIEW)
  @ApiOperation({
    summary: 'Get customer details for administrators',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.customersService.findOne(id);
  }

  @Patch(':id/status')
  @RequirePermissions(PERMISSION_CODES.CUSTOMER_SUSPEND)
  @ApiOperation({
    summary: 'Change customer status',
  })
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED' },
    @Req() request: AdminRequest,
  ) {
    const adminId = Number(request.user?.id);

    return this.customersService.updateStatus(
      id,
      body.status,
      adminId,
    );
  }
}
