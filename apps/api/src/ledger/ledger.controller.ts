import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { LedgerService } from './ledger.service.js';

interface AuthenticatedUser {
  id: number;
  email: string;
  type?: string;
}

@Controller('ledger')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(
    private readonly ledgerService: LedgerService,
  ) {}

  /*
   * ========================================================
   * USER LEDGER ACCOUNTS
   *
   * GET /ledger/accounts
   *
   * IMPORTANT:
   * This endpoint is user-scoped.
   *
   * It must NEVER return the global general ledger to a
   * normal authenticated customer.
   * ========================================================
   */
  @Get('accounts')
  async getAllAccounts(
    @Req()
    request: Request & {
      user: AuthenticatedUser;
    },
  ) {
    return this.ledgerService.getUserAccounts(
      request.user.id,
    );
  }

  /*
   * ========================================================
   * USER TRANSACTION LEDGER ENTRIES
   *
   * GET /ledger/transactions/:transactionId
   *
   * The service verifies that the transaction belongs to
   * one of the authenticated user's wallets.
   * ========================================================
   */
  @Get('transactions/:transactionId')
  async getTransactionEntries(
    @Req()
    request: Request & {
      user: AuthenticatedUser;
    },

    @Param(
      'transactionId',
      ParseIntPipe,
    )
    transactionId: number,
  ) {
    return this.ledgerService.getUserTransactionEntries(
      transactionId,
      request.user.id,
    );
  }

  /*
   * ========================================================
   * USER LEDGER ACCOUNT BALANCE
   *
   * GET /ledger/accounts/:accountId/balance
   *
   * The returned balance is calculated only from the
   * authenticated user's own ledger entries.
   * ========================================================
   */
  @Get('accounts/:accountId/balance')
  async getAccountBalance(
    @Req()
    request: Request & {
      user: AuthenticatedUser;
    },

    @Param(
      'accountId',
      ParseIntPipe,
    )
    accountId: number,
  ) {
    return this.ledgerService.getUserAccountBalance(
      accountId,
      request.user.id,
    );
  }
}
