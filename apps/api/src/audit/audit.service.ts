import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

interface CreateAuditLogInput {
  userId?: number;

  action: string;

  entity: string;

  entityId?: string;

  metadata?: string;
}

interface FindAuditLogsOptions {
  page?: number;

  limit?: number;

  action?: string;

  entity?: string;

  userId?: number;
}

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  /*
   * ==========================================
   * CREATE AUDIT LOG
   *
   * Used internally by:
   *
   * - WalletsService
   * - TransactionsService
   * - Ledger operations
   * - Future admin operations
   *
   * Audit logs should be immutable records.
   * ==========================================
   */
  async create(input: CreateAuditLogInput) {
    const auditLog = await this.prisma.client.orm.public.AuditLog.create({
      userId: input.userId ?? null,

      action: input.action,

      entity: input.entity,

      entityId: input.entityId ?? null,

      metadata: input.metadata ?? null,
    });

    return this.formatAuditLog(auditLog);
  }

  /*
   * ==========================================
   * GET ALL AUDIT LOGS
   *
   * Supports:
   *
   * - Pagination
   * - Action filtering
   * - Entity filtering
   * - User filtering
   *
   * Examples:
   *
   * GET /audit
   * GET /audit?action=DEPOSIT_COMPLETED
   * GET /audit?entity=TRANSACTION
   * GET /audit?userId=2
   * GET /audit?page=1&limit=20
   * ==========================================
   */
  async findAll(options: FindAuditLogsOptions = {}): Promise<any> {
    const page = options.page && options.page > 0 ? options.page : 1;

    const limit =
      options.limit && options.limit > 0 ? Math.min(options.limit, 100) : 20;

    /*
     * Get all audit logs.
     *
     * Current Prisma ORM runtime does not
     * use traditional skip/take pagination.
     */
    const auditLogs = await this.prisma.client.orm.public.AuditLog.all();

    /*
     * Apply filters.
     */
    let filteredLogs = auditLogs.filter((log: any) => {
      /*
       * ACTION FILTER
       */
      if (options.action && log.action !== options.action) {
        return false;
      }

      /*
       * ENTITY FILTER
       */
      if (options.entity && log.entity !== options.entity) {
        return false;
      }

      /*
       * USER FILTER
       */
      if (options.userId !== undefined && log.userId !== options.userId) {
        return false;
      }

      return true;
    });

    /*
     * Sort newest first.
     */
    filteredLogs = filteredLogs.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const total = filteredLogs.length;

    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

    const startIndex = (page - 1) * limit;

    const paginatedLogs = filteredLogs.slice(startIndex, startIndex + limit);

    return {
      data: paginatedLogs.map((log: any) => this.formatAuditLog(log)),

      pagination: {
        page,

        limit,

        total,

        totalPages,
      },
    };
  }

  /*
   * ==========================================
   * GET AUDIT LOGS FOR A SPECIFIC USER
   * ==========================================
   */
  async findByUser(
    userId: number,
    options: {
      page?: number;
      limit?: number;
      action?: string;
      entity?: string;
    } = {},
  ): Promise<any> {
    return this.findAll({
      page: options.page,

      limit: options.limit,

      action: options.action,

      entity: options.entity,

      userId,
    });
  }

  /*
   * ==========================================
   * GET AUDIT LOGS BY ENTITY
   *
   * Example:
   *
   * TRANSACTION
   * WALLET
   * USER
   * LEDGER_ACCOUNT
   * ==========================================
   */
  async findByEntity(entity: string, entityId?: string): Promise<any[]> {
    const auditLogs = await this.prisma.client.orm.public.AuditLog.all();

    const logs = auditLogs
      .filter((log: any) => {
        const entityMatches = log.entity === entity;

        const entityIdMatches =
          entityId === undefined ? true : log.entityId === entityId;

        return entityMatches && entityIdMatches;
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    return logs.map((log: any) => this.formatAuditLog(log));
  }

  /*
   * ==========================================
   * GET AUDIT LOGS BY ACTION
   *
   * Example:
   *
   * DEPOSIT_COMPLETED
   * WITHDRAWAL_COMPLETED
   * TRANSFER_COMPLETED
   * TRANSACTION_REVERSED
   * ==========================================
   */
  async findByAction(action: string): Promise<any[]> {
    const auditLogs = await this.prisma.client.orm.public.AuditLog.all();

    const logs = auditLogs
      .filter((log: any) => log.action === action)
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );

    return logs.map((log: any) => this.formatAuditLog(log));
  }

  /*
   * ==========================================
   * FORMAT AUDIT LOG
   *
   * Converts metadata JSON strings into
   * JavaScript objects where possible.
   * ==========================================
   */
  private formatAuditLog(auditLog: any) {
    let metadata = auditLog.metadata;

    /*
     * Parse JSON metadata safely.
     */
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        /*
         * Keep the original value when
         * metadata is not valid JSON.
         */
      }
    }

    return {
      ...auditLog,

      metadata,
    };
  }
}
