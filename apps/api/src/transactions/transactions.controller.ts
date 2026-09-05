import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { TransactionsService } from './transactions.service.js';

type TransactionType =
  | 'DEPOSIT'
  | 'WITHDRAWAL'
  | 'TRANSFER';

type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'REVERSED';

type Currency =
  | 'NGN'
  | 'USD'
  | 'EUR'
  | 'GBP';

@Controller('transactions')
@UseGuards(JwtAuthGuard)
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
  ) {}

  /*
   * ==========================================
   * TRANSACTION DASHBOARD SUMMARY
   *
   * GET /transactions/summary
   * ==========================================
   */
  @Get('summary')
  async getSummary(@Req() req: any) {
    return this.transactionsService.getSummary(
      req.user.id,
    );
  }

  /*
   * ==========================================
   * RECENT TRANSACTIONS
   *
   * GET /transactions/recent
   * GET /transactions/recent?limit=5
   * ==========================================
   */
  @Get('recent')
  async getRecentTransactions(
    @Req() req: any,

    @Query('limit') limit?: string,
  ) {
    const parsedLimit = limit
      ? Number(limit)
      : 5;

    if (
      !Number.isInteger(parsedLimit) ||
      parsedLimit < 1 ||
      parsedLimit > 20
    ) {
      throw new BadRequestException(
        'Recent transaction limit must be between 1 and 20',
      );
    }

    return this.transactionsService.getRecentTransactions(
      req.user.id,
      parsedLimit,
    );
  }

  /*
   * ==========================================
   * TRANSACTION ANALYTICS
   *
   * GET /transactions/analytics
   *
   * Examples:
   * /transactions/analytics?days=7
   * /transactions/analytics?days=30
   * /transactions/analytics?days=90
   * ==========================================
   */
  @Get('analytics')
  async getAnalytics(
    @Req() req: any,

    @Query('days') days?: string,
  ) {
    const parsedDays = days
      ? Number(days)
      : 30;

    if (
      !Number.isInteger(parsedDays) ||
      parsedDays < 1 ||
      parsedDays > 365
    ) {
      throw new BadRequestException(
        'Days must be an integer between 1 and 365',
      );
    }

    return this.transactionsService.getAnalytics(
      req.user.id,
      parsedDays,
    );
  }

  /*
   * ==========================================
   * GET ALL TRANSACTIONS
   *
   * GET /transactions
   *
   * Supports:
   *
   * - Pagination
   * - Transaction type filtering
   * - Status filtering
   * - Currency filtering
   * - Reference search
   * - Date range filtering
   *
   * Example:
   *
   * /transactions?page=1&limit=10
   *
   * /transactions?type=DEPOSIT
   *
   * /transactions?status=COMPLETED
   *
   * /transactions?currency=NGN
   *
   * /transactions?search=TXN-12345
   *
   * /transactions?startDate=2026-09-01
   * &endDate=2026-09-04
   * ==========================================
   */
  @Get()
  async findAll(
    @Req() req: any,

    @Query('page') page?: string,

    @Query('limit') limit?: string,

    @Query('type') type?: string,

    @Query('status') status?: string,

    @Query('currency') currency?: string,

    @Query('search') search?: string,

    @Query('startDate') startDate?: string,

    @Query('endDate') endDate?: string,
  ) {
    const parsedPage = page
      ? Number(page)
      : 1;

    const parsedLimit = limit
      ? Number(limit)
      : 10;

    /*
     * ==========================================
     * PAGINATION VALIDATION
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
     * VALID ENUM VALUES
     * ==========================================
     */
    const validTypes: TransactionType[] = [
      'DEPOSIT',
      'WITHDRAWAL',
      'TRANSFER',
    ];

    const validStatuses: TransactionStatus[] = [
      'PENDING',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
      'REVERSED',
    ];

    const validCurrencies: Currency[] = [
      'NGN',
      'USD',
      'EUR',
      'GBP',
    ];

    /*
     * ==========================================
     * TYPE VALIDATION
     * ==========================================
     */
    if (
      type &&
      !validTypes.includes(
        type as TransactionType,
      )
    ) {
      throw new BadRequestException(
        'Invalid transaction type',
      );
    }

    /*
     * ==========================================
     * STATUS VALIDATION
     * ==========================================
     */
    if (
      status &&
      !validStatuses.includes(
        status as TransactionStatus,
      )
    ) {
      throw new BadRequestException(
        'Invalid transaction status',
      );
    }

    /*
     * ==========================================
     * CURRENCY VALIDATION
     * ==========================================
     */
    if (
      currency &&
      !validCurrencies.includes(
        currency as Currency,
      )
    ) {
      throw new BadRequestException(
        'Invalid currency',
      );
    }

    /*
     * ==========================================
     * DATE VALIDATION
     * ==========================================
     */
    let parsedStartDate: Date | undefined;
    let parsedEndDate: Date | undefined;

    if (startDate) {
      parsedStartDate = new Date(startDate);

      if (
        isNaN(
          parsedStartDate.getTime(),
        )
      ) {
        throw new BadRequestException(
          'Invalid startDate format',
        );
      }

      /*
       * Start from beginning of selected day
       */
      parsedStartDate.setHours(
        0,
        0,
        0,
        0,
      );
    }

    if (endDate) {
      parsedEndDate = new Date(endDate);

      if (
        isNaN(
          parsedEndDate.getTime(),
        )
      ) {
        throw new BadRequestException(
          'Invalid endDate format',
        );
      }

      /*
       * Include the entire selected day
       */
      parsedEndDate.setHours(
        23,
        59,
        59,
        999,
      );
    }

    /*
     * ==========================================
     * DATE RANGE VALIDATION
     * ==========================================
     */
    if (
      parsedStartDate &&
      parsedEndDate &&
      parsedStartDate > parsedEndDate
    ) {
      throw new BadRequestException(
        'startDate cannot be greater than endDate',
      );
    }

    /*
     * ==========================================
     * OPTIONAL DATE RANGE PROTECTION
     *
     * Banking applications should avoid
     * unnecessarily large date queries.
     *
     * Maximum: 1 year
     * ==========================================
     */
    if (
      parsedStartDate &&
      parsedEndDate
    ) {
      const differenceInMilliseconds =
        parsedEndDate.getTime() -
        parsedStartDate.getTime();

      const differenceInDays =
        differenceInMilliseconds /
        (1000 * 60 * 60 * 24);

      if (differenceInDays > 366) {
        throw new BadRequestException(
          'Date range cannot exceed 365 days',
        );
      }
    }

    /*
     * ==========================================
     * FETCH TRANSACTIONS
     * ==========================================
     */
    return this.transactionsService.findAll(
      req.user.id,
      {
        page: parsedPage,

        limit: parsedLimit,

        type:
          type as
            | TransactionType
            | undefined,

        status:
          status as
            | TransactionStatus
            | undefined,

        currency:
          currency as
            | Currency
            | undefined,

        search:
          search?.trim() || undefined,

        startDate: parsedStartDate,

        endDate: parsedEndDate,
      },
    );
  }

  /*
   * ==========================================
   * GET TRANSACTION BY REFERENCE
   *
   * GET /transactions/reference/:reference
   *
   * IMPORTANT:
   * Must come before /:id
   * ==========================================
   */
  @Get('reference/:reference')
  async findByReference(
    @Req() req: any,

    @Param('reference')
    reference: string,
  ) {
    return this.transactionsService.findByReference(
      req.user.id,
      reference.trim(),
    );
  }

  /*
   * ==========================================
   * REVERSE TRANSACTION
   *
   * POST /transactions/:id/reverse
   *
   * Banking Rule:
   *
   * - Original transaction remains unchanged
   * - Reversal creates an audit trail
   * - Wallet balances are corrected
   * - Ledger entries are reversed
   * ==========================================
   */
  @Post(':id/reverse')
  async reverse(
    @Req() req: any,

    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.transactionsService.reverse(
      req.user.id,
      id,
    );
  }

  /*
   * ==========================================
   * GET TRANSACTION BY ID
   *
   * GET /transactions/:id
   *
   * IMPORTANT:
   * Must come after all specific routes
   * ==========================================
   */
  @Get(':id')
  async findOne(
    @Req() req: any,

    @Param('id', ParseIntPipe)
    id: number,
  ) {
    return this.transactionsService.findOne(
      req.user.id,
      id,
    );
  }
}