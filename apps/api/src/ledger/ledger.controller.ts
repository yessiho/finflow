import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Req,
  UseGuards,
} from '@nestjs/common';

import { Request } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { LedgerService } from './ledger.service.js';

/*
 * ==========================================
 * AUTHENTICATED REQUEST TYPE
 * ==========================================
 *
 * JwtAuthGuard attaches the authenticated user
 * to request.user.
 */
interface AuthenticatedRequest extends Request {
  user: {
    id: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    type?: string;
  };
}

@Controller('ledger')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(private readonly ledgerService: LedgerService) {}

  /*
   * ==========================================
   * GET CURRENT USER LEDGER ACCOUNTS
   *
   * GET /ledger/accounts
   *
   * IMPORTANT:
   *
   * Users can only see ledger accounts and
   * balances connected to their own transactions.
   * ==========================================
   */
  @Get('accounts')
  async getAllAccounts(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.ledgerService.getAccountsByUser(
      request.user.id,
    );
  }

  /*
   * ==========================================
   * GET LEDGER ENTRIES FOR A TRANSACTION
   *
   * GET /ledger/transactions/:transactionId
   *
   * IMPORTANT:
   *
   * The service verifies that the transaction
   * belongs to the authenticated user.
   * ==========================================
   */
  @Get('transactions/:transactionId')
  async getTransactionEntries(
    @Req() request: AuthenticatedRequest,

    @Param('transactionId', ParseIntPipe)
    transactionId: number,
  ) {
    return this.ledgerService.getTransactionEntriesByUser(
      request.user.id,
      transactionId,
    );
  }

  /*
   * ==========================================
   * GET LEDGER ACCOUNT BALANCE
   *
   * GET /ledger/accounts/:accountId/balance
   *
   * IMPORTANT:
   *
   * The balance is calculated only from
   * transactions belonging to the current user.
   * ==========================================
   */
  @Get('accounts/:accountId/balance')
  async getAccountBalance(
    @Req() request: AuthenticatedRequest,

    @Param('accountId', ParseIntPipe)
    accountId: number,
  ) {
    return this.ledgerService.getAccountBalanceByUser(
      request.user.id,
      accountId,
    );
  }
}