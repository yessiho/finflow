import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { AuditService } from './audit.service.js';

/*
 * ==========================================
 * JWT USER TYPE
 * ==========================================
 */
interface AuthenticatedUser {
  id: number;
  email: string;
  type: string;
}

@Controller('audit')
@UseGuards(JwtAuthGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  /*
   * ==========================================
   * GET CURRENT USER AUDIT LOGS
   *
   * GET /audit
   *
   * Optional:
   *
   * ?page=1
   * ?limit=20
   * ?action=DEPOSIT
   * ?entity=TRANSACTION
   *
   * IMPORTANT:
   *
   * The authenticated user's ID comes from
   * the JWT token.
   *
   * Users cannot request another user's logs.
   * ==========================================
   */
  @Get()
  async findAll(
    @Req() request: Request,

    @Query('page') page?: string,

    @Query('limit') limit?: string,

    @Query('action') action?: string,

    @Query('entity') entity?: string,
  ): Promise<unknown> {
    const user = request.user as AuthenticatedUser;

    const parsedPage = page ? Number(page) : 1;

    const parsedLimit = limit ? Number(limit) : 20;

    /*
     * ==========================================
     * PAGE VALIDATION
     * ==========================================
     */
    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
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
     * SECURITY:
     *
     * Always use the authenticated user's ID.
     *
     * Never accept userId from query parameters.
     * ==========================================
     */
    return this.auditService.findByUser(user.id, {
      page: parsedPage,

      limit: parsedLimit,

      action: action?.trim() || undefined,

      entity: entity?.trim() || undefined,
    });
  }
}