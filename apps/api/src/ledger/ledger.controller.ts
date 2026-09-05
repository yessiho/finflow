import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { LedgerService } from './ledger.service.js';

@Controller('ledger')
@UseGuards(JwtAuthGuard)
export class LedgerController {
  constructor(
    private readonly ledgerService: LedgerService,
  ) {}

  /*
   * ==========================================
   * GET ALL LEDGER ACCOUNTS
   *
   * GET /ledger/accounts
   * ==========================================
   */
  @Get('accounts')
  async getAllAccounts() {
    return this.ledgerService.getAllAccounts();
  }

  /*
   * ==========================================
   * GET LEDGER ENTRIES FOR A TRANSACTION
   *
   * GET /ledger/transactions/:transactionId
   * ==========================================
   */
  @Get('transactions/:transactionId')
  async getTransactionEntries(
    @Param(
      'transactionId',
      ParseIntPipe,
    )
    transactionId: number,
  ) {
    return this.ledgerService.getTransactionEntries(
      transactionId,
    );
  }

  /*
   * ==========================================
   * GET LEDGER ACCOUNT BALANCE
   *
   * GET /ledger/accounts/:accountId/balance
   * ==========================================
   */
  @Get('accounts/:accountId/balance')
  async getAccountBalance(
    @Param(
      'accountId',
      ParseIntPipe,
    )
    accountId: number,
  ) {
    return this.ledgerService.getAccountBalance(
      accountId,
    );
  }
}