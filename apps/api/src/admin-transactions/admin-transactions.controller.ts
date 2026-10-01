import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { RequirePermissions } from '../rbac/rbac.decorator.js';
import { PERMISSION_CODES } from '../rbac/rbac.constants.js';
import { RbacGuard } from '../rbac/rbac.guard.js';

import { AdminTransactionsService } from './admin-transactions.service.js';
import { QueryAdminTransactionsDto } from './dto/query-admin-transactions.dto.js';

@ApiTags('Admin Transactions')
@ApiBearerAuth('access-token')
@Controller('admin/transactions')
@UseGuards(RbacGuard)
export class AdminTransactionsController {
  constructor(
    private readonly transactionsService: AdminTransactionsService,
  ) {}

  @Get()
  @RequirePermissions(PERMISSION_CODES.TRANSACTION_VIEW)
  @ApiOperation({
    summary: 'List customer transactions for administrators',
  })
  findAll(@Query() query: QueryAdminTransactionsDto) {
    return this.transactionsService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions(PERMISSION_CODES.TRANSACTION_VIEW)
  @ApiOperation({
    summary: 'Get customer transaction details',
  })
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.transactionsService.findOne(id);
  }
}