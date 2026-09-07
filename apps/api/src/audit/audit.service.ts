import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

/*
 * ==========================================
 * CREATE AUDIT LOG INPUT
 * ==========================================
 */
interface CreateAuditLogInput {
  userId?: number;

  action: string;

  entity: string;

  entityId?: string;

  metadata?: string;
}

/*
 * ==========================================
 * FIND AUDIT LOG OPTIONS
 * ==========================================
 */
interface FindAuditLogsOptions {
  page?: number;

  limit?: number;

  action?: string;

  entity?: string;

  /*
   * Used internally to scope audit logs
   * to a specific authenticated user.
   */
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
   * - LedgerService
   * - Future authenticated operations
   *
   * Audit logs are immutable records.
   * ==========================================
   */
  async create(input: CreateAuditLogInput) {
    const auditLog = await this.prisma.client.orm.public.AuditLog.create({
      /*
       * Associate the audit log with the user
       * performing the action.
       */
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
   * FIND AUDIT LOGS
   *
   * Supports:
   *
   * - Pagination
   * - Action filtering
   * - Entity filtering
   * - User filtering
   *
   * IMPORTANT:
   *
   * For user-facing endpoints, use findByUser()
   * so records are always scoped to the
   * authenticated user.
   * ==========================================
   */
  async findAll(
    options: FindAuditLogsOptions = {},
  ): Promise<any> {
    const page =
      options.page && options.page > 0
        ? options.page
        : 1;

    const limit =
      options.limit && options.limit > 0
        ? Math.min(options.limit, 100)
        : 20;

    /*
     * ==========================================
     * GET AUDIT LOGS
     *
     * Current Prisma ORM runtime uses .all(),
     * therefore filtering and pagination are
     * handled below.
     * ==========================================
     */
    const auditLogs =
      await this.prisma.client.orm.public.AuditLog.all();

    /*
     * ==========================================
     * APPLY FILTERS
     * ==========================================
     */
    let filteredLogs = auditLogs.filter((log: any) => {
      /*
       * ACTION FILTER
       */
      if (
        options.action &&
        log.action !== options.action
      ) {
        return false;
      }

      /*
       * ENTITY FILTER
       */
      if (
        options.entity &&
        log.entity !== options.entity
      ) {
        return false;
      }

      /*
       * USER SECURITY FILTER
       *
       * When userId is provided, only return
       * records belonging to that user.
       */
      if (
        options.userId !== undefined &&
        log.userId !== options.userId
      ) {
        return false;
      }

      return true;
    });

    /*
     * ==========================================
     * SORT NEWEST FIRST
     * ==========================================
     */
    filteredLogs = filteredLogs.sort(
      (a: any, b: any) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );

    /*
     * ==========================================
     * PAGINATION
     * ==========================================
     */
    const total = filteredLogs.length;

    const totalPages =
      total === 0
        ? 0
        : Math.ceil(total / limit);

    const startIndex =
      (page - 1) * limit;

    const paginatedLogs =
      filteredLogs.slice(
        startIndex,
        startIndex + limit,
      );

    /*
     * ==========================================
     * RESPONSE
     * ==========================================
     */
    return {
      data: paginatedLogs.map((log: any) =>
        this.formatAuditLog(log),
      ),

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
   *
   * This is the primary method for
   * authenticated user audit history.
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

      /*
       * Always scope records to this user.
       */
      userId,
    });
  }

  /*
   * ==========================================
   * GET AUDIT LOGS BY ENTITY
   *
   * Optionally scoped to a user.
   *
   * Examples:
   *
   * TRANSACTION
   * WALLET
   * USER
   * LEDGER_ACCOUNT
   * ==========================================
   */
  async findByEntity(
    entity: string,
    entityId?: string,
    userId?: number,
  ): Promise<any[]> {
    const auditLogs =
      await this.prisma.client.orm.public.AuditLog.all();

    const logs = auditLogs
      .filter((log: any) => {
        /*
         * ENTITY FILTER
         */
        if (log.entity !== entity) {
          return false;
        }

        /*
         * ENTITY ID FILTER
         */
        if (
          entityId !== undefined &&
          log.entityId !== entityId
        ) {
          return false;
        }

        /*
         * USER FILTER
         */
        if (
          userId !== undefined &&
          log.userId !== userId
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );

    return logs.map((log: any) =>
      this.formatAuditLog(log),
    );
  }

  /*
   * ==========================================
   * GET AUDIT LOGS BY ACTION
   *
   * Optionally scoped to a user.
   *
   * Examples:
   *
   * DEPOSIT_COMPLETED
   * WITHDRAWAL_COMPLETED
   * TRANSFER_COMPLETED
   * TRANSACTION_REVERSED
   * ==========================================
   */
  async findByAction(
    action: string,
    userId?: number,
  ): Promise<any[]> {
    const auditLogs =
      await this.prisma.client.orm.public.AuditLog.all();

    const logs = auditLogs
      .filter((log: any) => {
        /*
         * ACTION FILTER
         */
        if (log.action !== action) {
          return false;
        }

        /*
         * USER FILTER
         */
        if (
          userId !== undefined &&
          log.userId !== userId
        ) {
          return false;
        }

        return true;
      })
      .sort(
        (a: any, b: any) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime(),
      );

    return logs.map((log: any) =>
      this.formatAuditLog(log),
    );
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
     * ==========================================
     * PARSE JSON METADATA SAFELY
     * ==========================================
     */
    if (typeof metadata === 'string') {
      try {
        metadata = JSON.parse(metadata);
      } catch {
        /*
         * Keep the original metadata value when
         * it is not valid JSON.
         */
      }
    }

    return {
      ...auditLog,

      metadata,
    };
  }
}