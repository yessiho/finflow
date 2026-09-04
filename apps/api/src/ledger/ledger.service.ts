import {
  BadRequestException,
  Injectable,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

type Currency =
  | 'NGN'
  | 'USD'
  | 'EUR'
  | 'GBP';

type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'REVENUE'
  | 'EXPENSE'
  | 'EQUITY';

@Injectable()
export class LedgerService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /*
   * ==========================================
   * GET OR CREATE LEDGER ACCOUNT
   * ==========================================
   */
  async getOrCreateAccount(
    tx: any,
    code: string,
    name: string,
    type: AccountType,
    currency: Currency,
  ) {
    const existingAccount =
      await tx.orm.public.LedgerAccount.first({
        code,
      });

    if (existingAccount) {
      return existingAccount;
    }

    return tx.orm.public.LedgerAccount.create({
      code,
      name,
      type,
      currency,
      active: true,
    });
  }

  /*
   * ==========================================
   * GET CASH ACCOUNT
   * ==========================================
   */
  async getCashAccount(
    tx: any,
    currency: Currency,
  ) {
    return this.getOrCreateAccount(
      tx,
      `CASH-${currency}`,
      `Cash / Settlement Account (${currency})`,
      'ASSET',
      currency,
    );
  }

  /*
   * ==========================================
   * GET WALLET LIABILITY ACCOUNT
   * ==========================================
   */
  async getWalletLiabilityAccount(
    tx: any,
    currency: Currency,
  ) {
    return this.getOrCreateAccount(
      tx,
      `WALLET-${currency}`,
      `Customer Wallet Liability (${currency})`,
      'LIABILITY',
      currency,
    );
  }

  /*
   * ==========================================
   * VALIDATE DOUBLE ENTRY
   * ==========================================
   */
  validateEntries(
    entries: Array<{
      accountId: number;
      debit: bigint;
      credit: bigint;
    }>,
  ) {
    if (entries.length < 2) {
      throw new BadRequestException(
        'A ledger transaction requires at least two entries',
      );
    }

    let totalDebit = 0n;
    let totalCredit = 0n;

    for (const entry of entries) {
      if (
        entry.debit < 0n ||
        entry.credit < 0n
      ) {
        throw new BadRequestException(
          'Ledger amounts cannot be negative',
        );
      }

      if (
        entry.debit > 0n &&
        entry.credit > 0n
      ) {
        throw new BadRequestException(
          'A ledger entry cannot contain both debit and credit amounts',
        );
      }

      if (
        entry.debit === 0n &&
        entry.credit === 0n
      ) {
        throw new BadRequestException(
          'A ledger entry must contain a debit or credit amount',
        );
      }

      totalDebit += entry.debit;
      totalCredit += entry.credit;
    }

    if (totalDebit !== totalCredit) {
      throw new BadRequestException(
        'Ledger transaction is not balanced',
      );
    }

    return {
      totalDebit,
      totalCredit,
    };
  }

  /*
   * ==========================================
   * CREATE DOUBLE ENTRY
   *
   * IMPORTANT:
   * Uses the same database transaction (tx)
   * ==========================================
   */
  async createDoubleEntry(
    tx: any,
    transactionId: number,
    entries: Array<{
      accountId: number;
      debit: bigint;
      credit: bigint;
    }>,
  ) {
    this.validateEntries(entries);

    const createdEntries = [];

    for (const entry of entries) {
      const createdEntry =
        await tx.orm.public.LedgerEntry.create({
          transactionId,
          accountId: entry.accountId,
          debit: entry.debit,
          credit: entry.credit,
        });

      createdEntries.push(createdEntry);
    }

    return createdEntries;
  }

  /*
   * ==========================================
   * POST DEPOSIT
   *
   * Debit: Cash
   * Credit: Wallet Liability
   * ==========================================
   */
  async postDeposit(
    tx: any,
    transactionId: number,
    amount: bigint,
    currency: Currency,
  ) {
    const cashAccount =
      await this.getCashAccount(
        tx,
        currency,
      );

    const walletAccount =
      await this.getWalletLiabilityAccount(
        tx,
        currency,
      );

    return this.createDoubleEntry(
      tx,
      transactionId,
      [
        {
          accountId: cashAccount.id,
          debit: amount,
          credit: 0n,
        },
        {
          accountId: walletAccount.id,
          debit: 0n,
          credit: amount,
        },
      ],
    );
  }

  /*
   * ==========================================
   * POST WITHDRAWAL
   *
   * Debit: Wallet Liability
   * Credit: Cash
   * ==========================================
   */
  async postWithdrawal(
    tx: any,
    transactionId: number,
    amount: bigint,
    currency: Currency,
  ) {
    const cashAccount =
      await this.getCashAccount(
        tx,
        currency,
      );

    const walletAccount =
      await this.getWalletLiabilityAccount(
        tx,
        currency,
      );

    return this.createDoubleEntry(
      tx,
      transactionId,
      [
        {
          accountId: walletAccount.id,
          debit: amount,
          credit: 0n,
        },
        {
          accountId: cashAccount.id,
          debit: 0n,
          credit: amount,
        },
      ],
    );
  }

  /*
   * ==========================================
   * POST TRANSFER
   *
   * Internal wallet transfer
   * ==========================================
   */
  async postTransfer(
    tx: any,
    transactionId: number,
    amount: bigint,
    currency: Currency,
  ) {
    const walletAccount =
      await this.getWalletLiabilityAccount(
        tx,
        currency,
      );

    return this.createDoubleEntry(
      tx,
      transactionId,
      [
        {
          accountId: walletAccount.id,
          debit: amount,
          credit: 0n,
        },
        {
          accountId: walletAccount.id,
          debit: 0n,
          credit: amount,
        },
      ],
    );
  }

  /*
   * ==========================================
   * REVERSE LEDGER TRANSACTION
   * ==========================================
   */
  async reverseTransaction(
    originalTransactionId: number,
    reversalTransactionId: number,
  ) {
    const originalEntries =
      await this.prisma.client.orm.public.LedgerEntry
        .where({
          transactionId: originalTransactionId,
        })
        .all();

    if (!originalEntries.length) {
      throw new BadRequestException(
        'No ledger entries found for transaction',
      );
    }

    const reversalEntries =
      originalEntries.map((entry) => ({
        accountId: entry.accountId,
        debit: entry.credit,
        credit: entry.debit,
      }));

    /*
     * Reversal happens outside wallet transaction
     */
    return this.prisma.client.transaction(
      async (tx) => {
        return this.createDoubleEntry(
          tx,
          reversalTransactionId,
          reversalEntries,
        );
      },
    );
  }

  /*
   * ==========================================
   * GET TRANSACTION LEDGER ENTRIES
   * ==========================================
   */
  async getTransactionEntries(
    transactionId: number,
  ) {
    const entries =
      await this.prisma.client.orm.public.LedgerEntry
        .where({
          transactionId,
        })
        .all();

    return entries.map((entry) => ({
      ...entry,
      debit: entry.debit.toString(),
      credit: entry.credit.toString(),
    }));
  }

  /*
   * ==========================================
   * GET ACCOUNT BALANCE
   * ==========================================
   */
  async getAccountBalance(
    accountId: number,
  ) {
    const account =
      await this.prisma.client.orm.public.LedgerAccount.first({
        id: accountId,
      });

    if (!account) {
      throw new BadRequestException(
        'Ledger account not found',
      );
    }

    const entries =
      await this.prisma.client.orm.public.LedgerEntry
        .where({
          accountId,
        })
        .all();

    let totalDebit = 0n;
    let totalCredit = 0n;

    for (const entry of entries) {
      totalDebit += entry.debit;
      totalCredit += entry.credit;
    }

    let balance: bigint;

    if (
      account.type === 'ASSET' ||
      account.type === 'EXPENSE'
    ) {
      balance =
        totalDebit - totalCredit;
    } else {
      balance =
        totalCredit - totalDebit;
    }

    return {
      account,
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      balance: balance.toString(),
    };
  }
}