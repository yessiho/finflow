import { BadRequestException, Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

type Currency = 'NGN' | 'USD' | 'EUR' | 'GBP';

type AccountType =
  | 'ASSET'
  | 'LIABILITY'
  | 'REVENUE'
  | 'EXPENSE'
  | 'EQUITY';

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

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
    const existingAccount = await tx.orm.public.LedgerAccount.first({
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
  async getCashAccount(tx: any, currency: Currency) {
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
      if (entry.debit < 0n || entry.credit < 0n) {
        throw new BadRequestException(
          'Ledger amounts cannot be negative',
        );
      }

      if (entry.debit > 0n && entry.credit > 0n) {
        throw new BadRequestException(
          'A ledger entry cannot contain both debit and credit amounts',
        );
      }

      if (entry.debit === 0n && entry.credit === 0n) {
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
      await this.getCashAccount(tx, currency);

    const walletAccount =
      await this.getWalletLiabilityAccount(tx, currency);

    return this.createDoubleEntry(tx, transactionId, [
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
    ]);
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
      await this.getCashAccount(tx, currency);

    const walletAccount =
      await this.getWalletLiabilityAccount(tx, currency);

    return this.createDoubleEntry(tx, transactionId, [
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
    ]);
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
      await this.getWalletLiabilityAccount(tx, currency);

    return this.createDoubleEntry(tx, transactionId, [
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
    ]);
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
      await this.prisma.client.orm.public.LedgerEntry.where({
        transactionId: originalTransactionId,
      }).all();

    if (!originalEntries.length) {
      throw new BadRequestException(
        'No ledger entries found for transaction',
      );
    }

    const reversalEntries = originalEntries.map(
      (entry) => ({
        accountId: entry.accountId,
        debit: entry.credit,
        credit: entry.debit,
      }),
    );

    return this.prisma.client.transaction(async (tx) => {
      return this.createDoubleEntry(
        tx,
        reversalTransactionId,
        reversalEntries,
      );
    });
  }

  /*
   * ==========================================
   * GET USER TRANSACTION IDS
   *
   * A transaction belongs to a user when:
   *
   * - Source wallet belongs to the user
   * OR
   * - Destination wallet belongs to the user
   * ==========================================
   */
  private async getUserTransactionIds(
    userId: number,
  ): Promise<number[]> {
    const wallets =
      await this.prisma.client.orm.public.Wallet.where({
        userId,
      }).all();

    if (!wallets.length) {
      return [];
    }

    const walletIds = new Set(
      wallets.map((wallet) => wallet.id),
    );

    const transactions =
      await this.prisma.client.orm.public.Transaction.all();

    return transactions
      .filter((transaction) => {
        return (
          (transaction.sourceWalletId !== null &&
            transaction.sourceWalletId !== undefined &&
            walletIds.has(transaction.sourceWalletId)) ||
          (transaction.destinationWalletId !== null &&
            transaction.destinationWalletId !== undefined &&
            walletIds.has(transaction.destinationWalletId))
        );
      })
      .map((transaction) => transaction.id);
  }

  /*
   * ==========================================
   * GET ALL LEDGER ACCOUNTS
   *
   * ADMIN / SYSTEM VIEW
   *
   * Returns all accounts globally.
   * ==========================================
   */
  async getAllAccounts() {
    const accounts =
      await this.prisma.client.orm.public.LedgerAccount.all();

    const accountBalances = await Promise.all(
      accounts.map(async (account) => {
        const entries =
          await this.prisma.client.orm.public.LedgerEntry.where({
            accountId: account.id,
          }).all();

        let totalDebit = 0n;
        let totalCredit = 0n;

        for (const entry of entries) {
          totalDebit += entry.debit;
          totalCredit += entry.credit;
        }

        let balance = 0n;

        if (
          account.type === 'ASSET' ||
          account.type === 'EXPENSE'
        ) {
          balance = totalDebit - totalCredit;
        } else {
          balance = totalCredit - totalDebit;
        }

        return {
          ...account,
          totalDebit: totalDebit.toString(),
          totalCredit: totalCredit.toString(),
          balance: balance.toString(),
        };
      }),
    );

    return accountBalances;
  }

  /*
   * ==========================================
   * GET LEDGER ACCOUNTS FOR A SPECIFIC USER
   *
   * Only includes ledger entries connected
   * to transactions belonging to the user.
   *
   * This prevents:
   *
   * User A seeing User B's ledger activity.
   * ==========================================
   */
  async getAccountsByUser(userId: number) {
    const userTransactionIds =
      await this.getUserTransactionIds(userId);

    if (!userTransactionIds.length) {
      return [];
    }

    const transactionIdSet = new Set(
      userTransactionIds,
    );

    const allEntries =
      await this.prisma.client.orm.public.LedgerEntry.all();

    const userEntries = allEntries.filter((entry) =>
      transactionIdSet.has(entry.transactionId),
    );

    if (!userEntries.length) {
      return [];
    }

    const accountIds = new Set(
      userEntries.map((entry) => entry.accountId),
    );

    const accounts =
      await this.prisma.client.orm.public.LedgerAccount.all();

    const userAccounts = accounts.filter((account) =>
      accountIds.has(account.id),
    );

    return userAccounts.map((account) => {
      const accountEntries = userEntries.filter(
        (entry) => entry.accountId === account.id,
      );

      let totalDebit = 0n;
      let totalCredit = 0n;

      for (const entry of accountEntries) {
        totalDebit += entry.debit;
        totalCredit += entry.credit;
      }

      let balance = 0n;

      if (
        account.type === 'ASSET' ||
        account.type === 'EXPENSE'
      ) {
        balance = totalDebit - totalCredit;
      } else {
        balance = totalCredit - totalDebit;
      }

      return {
        ...account,
        totalDebit: totalDebit.toString(),
        totalCredit: totalCredit.toString(),
        balance: balance.toString(),
      };
    });
  }

  /*
   * ==========================================
   * GET TRANSACTION LEDGER ENTRIES
   *
   * SYSTEM / ADMIN METHOD
   *
   * GET /ledger/transactions/:transactionId
   * ==========================================
   */
  async getTransactionEntries(transactionId: number) {
    const entries =
      await this.prisma.client.orm.public.LedgerEntry.where({
        transactionId,
      }).all();

    return entries.map((entry) => ({
      ...entry,
      debit: entry.debit.toString(),
      credit: entry.credit.toString(),
    }));
  }

  /*
   * ==========================================
   * GET USER TRANSACTION LEDGER ENTRIES
   *
   * Ensures the transaction belongs
   * to the authenticated user.
   * ==========================================
   */
  async getTransactionEntriesByUser(
    userId: number,
    transactionId: number,
  ) {
    const userTransactionIds =
      await this.getUserTransactionIds(userId);

    if (!userTransactionIds.includes(transactionId)) {
      throw new BadRequestException(
        'You do not have access to this ledger transaction',
      );
    }

    return this.getTransactionEntries(transactionId);
  }

  /*
   * ==========================================
   * GET ACCOUNT BALANCE
   *
   * SYSTEM / ADMIN METHOD
   * ==========================================
   */
  async getAccountBalance(accountId: number) {
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
      await this.prisma.client.orm.public.LedgerEntry.where({
        accountId,
      }).all();

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
      balance = totalDebit - totalCredit;
    } else {
      balance = totalCredit - totalDebit;
    }

    return {
      account,
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      balance: balance.toString(),
    };
  }

  /*
   * ==========================================
   * GET ACCOUNT BALANCE FOR A USER
   *
   * Only calculates entries belonging
   * to the authenticated user's transactions.
   * ==========================================
   */
  async getAccountBalanceByUser(
    userId: number,
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

    const userTransactionIds =
      await this.getUserTransactionIds(userId);

    if (!userTransactionIds.length) {
      throw new BadRequestException(
        'No ledger activity found for this user',
      );
    }

    const transactionIdSet = new Set(
      userTransactionIds,
    );

    const entries =
      await this.prisma.client.orm.public.LedgerEntry.where({
        accountId,
      }).all();

    const userEntries = entries.filter((entry) =>
      transactionIdSet.has(entry.transactionId),
    );

    if (!userEntries.length) {
      throw new BadRequestException(
        'You do not have access to this ledger account',
      );
    }

    let totalDebit = 0n;
    let totalCredit = 0n;

    for (const entry of userEntries) {
      totalDebit += entry.debit;
      totalCredit += entry.credit;
    }

    let balance: bigint;

    if (
      account.type === 'ASSET' ||
      account.type === 'EXPENSE'
    ) {
      balance = totalDebit - totalCredit;
    } else {
      balance = totalCredit - totalDebit;
    }

    return {
      account,
      totalDebit: totalDebit.toString(),
      totalCredit: totalCredit.toString(),
      balance: balance.toString(),
    };
  }
}