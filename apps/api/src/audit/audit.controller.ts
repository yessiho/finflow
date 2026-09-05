import {
  BadRequestException,
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AuditService } from './audit.service.js';

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
  ) {}

  /*
   * ==========================================
   * GET AUDIT LOGS
   *
   * GET /audit
   *
   * Optional:
   *
   * ?page=1
   * ?limit=20
   * ?action=DEPOSIT
   * ?entity=TRANSACTION
   * ?userId=2
   * ==========================================
   */
  @Get()
  async findAll(
    @Query('page') page?: string,

    @Query('limit') limit?: string,

    @Query('action') action?: string,

    @Query('entity') entity?: string,

    @Query('userId') userId?: string,
  ): Promise<unknown> {
    const parsedPage = page
      ? Number(page)
      : 1;

    const parsedLimit = limit
      ? Number(limit)
      : 20;

    const parsedUserId = userId
      ? Number(userId)
      : undefined;

    /*
     * ==========================================
     * PAGE VALIDATION
     * ==========================================
     */
    if (
      !Number.isInteger(parsedPage) ||
      parsedPage < 1
    ) {
      throw new BadRequestException(
        'Page must be a positive integer',
      );
    }

    /*
     * ==========================================
     * LIMIT VALIDATION
     * ==========================================
     */
    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 100
    ) {
      throw new BadRequestException(
        'Limit must be between 1 and 100',
      );
    }

    /*
     * ==========================================
     * USER ID VALIDATION
     * ==========================================
     */
    if (
      parsedUserId !== undefined &&
      (
        !Number.isInteger(parsedUserId) ||
        parsedUserId < 1
      )
    ) {
      throw new BadRequestException(
        'User ID must be a positive integer',
      );
    }

    return this.auditService.findAll({
      page: parsedPage,

      limit: parsedLimit,

      action:
        action?.trim() || undefined,

      entity:
        entity?.trim() || undefined,

      userId: parsedUserId,
    });
  }
}