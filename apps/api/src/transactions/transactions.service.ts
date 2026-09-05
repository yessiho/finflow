import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import { LedgerService } from '../ledger/ledger.service.js';

import { AuditService } from '../audit/audit.service.js';

type TransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER';

type TransactionStatus =
  'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'REVERSED';

type Currency = 'NGN' | 'USD' | 'EUR' | 'GBP';

interface TransactionFilters {
  page?: number;

  limit?: number;

  type?: TransactionType;

  status?: TransactionStatus;

  currency?: Currency;

  search?: string;

  startDate?: Date;

  endDate?: Date;

  minAmount?: bigint;

  maxAmount?: bigint;
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,

    private readonly ledgerService: LedgerService,

    private readonly auditService: AuditService,
  ) {}

  /*
   * ==========================================
   * BIGINT SERIALIZER
   *
   * Converts BigInt values to strings before
   * sending the response.
   * ==========================================
   */
  private serialize<T>(data: T): T {
    return JSON.parse(
      JSON.stringify(data, (_, value) =>
        typeof value === 'bigint' ? value.toString() : value,
      ),
    );
  }

  /*
   * ==========================================
   * GET USER WALLETS
   * ==========================================
   */
  private async getUserWallets(userId: number) {
    const wallets = await this.prisma.client.orm.public.Wallet.all();

    return wallets.filter((wallet: any) => wallet.userId === userId);
  }

  /*
   * ==========================================
   * GET USER WALLET IDS
   * ==========================================
   */
  private async getUserWalletIds(userId: number): Promise<number[]> {
    const wallets = await this.getUserWallets(userId);

    return wallets.map((wallet: any) => wallet.id);
  }

  /*
   * ==========================================
   * GET USER TRANSACTIONS
   *
   * A transaction belongs to a user when the
   * user owns either the source wallet or
   * destination wallet.
   * ==========================================
   */
  private async getUserTransactions(userId: number) {
    const walletIds = await this.getUserWalletIds(userId);

    if (walletIds.length === 0) {
      return [];
    }

    const transactions = await this.prisma.client.orm.public.Transaction.all();

    return transactions.filter((transaction: any) => {
      const hasSourceAccess =
        transaction.sourceWalletId !== null &&
        walletIds.includes(transaction.sourceWalletId);

      const hasDestinationAccess =
        transaction.destinationWalletId !== null &&
        walletIds.includes(transaction.destinationWalletId);

      return hasSourceAccess || hasDestinationAccess;
    });
  }

  /*
   * ==========================================
   * CHECK TRANSACTION ACCESS
   * ==========================================
   */
  private async checkTransactionAccess(userId: number, transaction: any) {
    const walletIds = await this.getUserWalletIds(userId);

    const hasSourceAccess =
      transaction.sourceWalletId !== null &&
      walletIds.includes(transaction.sourceWalletId);

    const hasDestinationAccess =
      transaction.destinationWalletId !== null &&
      walletIds.includes(transaction.destinationWalletId);

    if (!hasSourceAccess && !hasDestinationAccess) {
      await this.auditService.create({
        userId,

        action: 'TRANSACTION_ACCESS_DENIED',

        entity: 'Transaction',

        entityId: String(transaction.id),

        metadata: JSON.stringify({
          transactionId: transaction.id,

          reference: transaction.reference,

          type: transaction.type,

          currency: transaction.currency,

          sourceWalletId: transaction.sourceWalletId,

          destinationWalletId: transaction.destinationWalletId,
        }),
      });

      throw new ForbiddenException(
        'You do not have access to this transaction',
      );
    }
  }

  /*
   * ==========================================
   * GET TRANSACTION SUMMARY
   *
   * GET /transactions/summary
   * ==========================================
   */
  async getSummary(userId: number) {
    const userTransactions = await this.getUserTransactions(userId);

    if (userTransactions.length === 0) {
      return {
        totalTransactions: 0,

        totalDeposits: '0',

        totalWithdrawals: '0',

        totalTransfers: '0',

        completedTransactions: 0,

        pendingTransactions: 0,

        failedTransactions: 0,

        reversedTransactions: 0,
      };
    }

    let totalDeposits = 0n;

    let totalWithdrawals = 0n;

    let totalTransfers = 0n;

    let completedTransactions = 0;

    let pendingTransactions = 0;

    let failedTransactions = 0;

    let reversedTransactions = 0;

    for (const transaction of userTransactions) {
      if (transaction.status === 'COMPLETED') {
        completedTransactions++;
      }

      if (transaction.status === 'PENDING') {
        pendingTransactions++;
      }

      if (transaction.status === 'FAILED') {
        failedTransactions++;
      }

      if (transaction.status === 'REVERSED') {
        reversedTransactions++;
      }

      if (
        transaction.status === 'REVERSED' ||
        transaction.status === 'FAILED'
      ) {
        continue;
      }

      const amount = BigInt(transaction.amount ?? 0);

      if (transaction.type === 'DEPOSIT') {
        totalDeposits += amount;
      }

      if (transaction.type === 'WITHDRAWAL') {
        totalWithdrawals += amount;
      }

      if (transaction.type === 'TRANSFER') {
        totalTransfers += amount;
      }
    }

    return {
      totalTransactions: userTransactions.length,

      totalDeposits: totalDeposits.toString(),

      totalWithdrawals: totalWithdrawals.toString(),

      totalTransfers: totalTransfers.toString(),

      completedTransactions,

      pendingTransactions,

      failedTransactions,

      reversedTransactions,
    };
  }

  /*
   * ==========================================
   * GET RECENT TRANSACTIONS
   *
   * GET /transactions/recent
   * ==========================================
   */
  async getRecentTransactions(userId: number, limit = 5) {
    const safeLimit =
      Number.isInteger(limit) && limit > 0 ? Math.min(limit, 100) : 5;

    const userTransactions = await this.getUserTransactions(userId);

    userTransactions.sort((a: any, b: any) => {
      const dateA = new Date(String(a.createdAt)).getTime();

      const dateB = new Date(String(b.createdAt)).getTime();

      return dateB - dateA;
    });

    return this.serialize(userTransactions.slice(0, safeLimit));
  }

  /*
   * ==========================================
   * GET TRANSACTION ANALYTICS
   *
   * GET /transactions/analytics
   * ==========================================
   */
  async getAnalytics(userId: number, days = 30) {
    const safeDays =
      Number.isInteger(days) && days > 0 ? Math.min(days, 365) : 30;

    const endDate = new Date();

    const startDate = new Date();

    startDate.setDate(endDate.getDate() - safeDays + 1);

    startDate.setHours(0, 0, 0, 0);

    const userTransactions = await this.getUserTransactions(userId);

    const transactions = userTransactions.filter((transaction: any) => {
      const transactionDate = new Date(String(transaction.createdAt));

      return transactionDate >= startDate && transactionDate <= endDate;
    });

    let totalAmount = 0n;

    let totalDeposits = 0n;

    let totalWithdrawals = 0n;

    let totalTransfers = 0n;

    let completedAmount = 0n;

    const typeMap = new Map<
      TransactionType,
      {
        count: number;
        amount: bigint;
      }
    >();

    const statusMap = new Map<TransactionStatus, number>();

    const currencyMap = new Map<
      string,
      {
        count: number;
        amount: bigint;
      }
    >();

    const dailyMap = new Map<
      string,
      {
        count: number;
        amount: bigint;
        deposits: bigint;
        withdrawals: bigint;
        transfers: bigint;
      }
    >();

    const weeklyMap = new Map<
      string,
      {
        count: number;
        amount: bigint;
      }
    >();

    const monthlyMap = new Map<
      string,
      {
        count: number;
        amount: bigint;
      }
    >();

    const transactionTypes: TransactionType[] = [
      'DEPOSIT',
      'WITHDRAWAL',
      'TRANSFER',
    ];

    for (const type of transactionTypes) {
      typeMap.set(type, {
        count: 0,
        amount: 0n,
      });
    }

    const transactionStatuses: TransactionStatus[] = [
      'PENDING',
      'PROCESSING',
      'COMPLETED',
      'FAILED',
      'REVERSED',
    ];

    for (const status of transactionStatuses) {
      statusMap.set(status, 0);
    }

    for (const transaction of transactions) {
      const amount = BigInt(transaction.amount ?? 0);

      const type = transaction.type as TransactionType;

      const status = transaction.status as TransactionStatus;

      const currency = transaction.currency;

      statusMap.set(status, (statusMap.get(status) ?? 0) + 1);

      const isFinanciallyValid = status !== 'REVERSED' && status !== 'FAILED';

      const typeData = typeMap.get(type);

      if (typeData) {
        typeData.count++;

        if (isFinanciallyValid) {
          typeData.amount += amount;
        }
      }

      if (!currencyMap.has(currency)) {
        currencyMap.set(currency, {
          count: 0,
          amount: 0n,
        });
      }

      const currencyData = currencyMap.get(currency)!;

      currencyData.count++;

      if (isFinanciallyValid) {
        currencyData.amount += amount;
      }

      if (isFinanciallyValid) {
        totalAmount += amount;

        if (type === 'DEPOSIT') {
          totalDeposits += amount;
        }

        if (type === 'WITHDRAWAL') {
          totalWithdrawals += amount;
        }

        if (type === 'TRANSFER') {
          totalTransfers += amount;
        }

        if (status === 'COMPLETED') {
          completedAmount += amount;
        }
      }

      const transactionDate = new Date(String(transaction.createdAt));

      const dayKey = transactionDate.toISOString().slice(0, 10);

      if (!dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, {
          count: 0,
          amount: 0n,
          deposits: 0n,
          withdrawals: 0n,
          transfers: 0n,
        });
      }

      const dailyData = dailyMap.get(dayKey)!;

      dailyData.count++;

      if (isFinanciallyValid) {
        dailyData.amount += amount;

        if (type === 'DEPOSIT') {
          dailyData.deposits += amount;
        }

        if (type === 'WITHDRAWAL') {
          dailyData.withdrawals += amount;
        }

        if (type === 'TRANSFER') {
          dailyData.transfers += amount;
        }
      }

      const weekKey = this.getWeekKey(transactionDate);

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          count: 0,
          amount: 0n,
        });
      }

      const weeklyData = weeklyMap.get(weekKey)!;

      weeklyData.count++;

      if (isFinanciallyValid) {
        weeklyData.amount += amount;
      }

      const monthKey = transactionDate.toISOString().slice(0, 7);

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          count: 0,
          amount: 0n,
        });
      }

      const monthlyData = monthlyMap.get(monthKey)!;

      monthlyData.count++;

      if (isFinanciallyValid) {
        monthlyData.amount += amount;
      }
    }

    return {
      period: {
        days: safeDays,

        startDate: startDate.toISOString(),

        endDate: endDate.toISOString(),
      },

      overview: {
        totalTransactions: transactions.length,

        totalAmount: totalAmount.toString(),

        totalDeposits: totalDeposits.toString(),

        totalWithdrawals: totalWithdrawals.toString(),

        totalTransfers: totalTransfers.toString(),

        completedAmount: completedAmount.toString(),
      },

      byType: transactionTypes.map((type) => {
        const data = typeMap.get(type)!;

        return {
          type,

          count: data.count,

          amount: data.amount.toString(),
        };
      }),

      byStatus: transactionStatuses.map((status) => ({
        status,

        count: statusMap.get(status) ?? 0,
      })),

      byCurrency: Array.from(currencyMap.entries()).map(([currency, data]) => ({
        currency,

        count: data.count,

        amount: data.amount.toString(),
      })),

      charts: {
        daily: Array.from(dailyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, data]) => ({
            date,

            count: data.count,

            amount: data.amount.toString(),

            deposits: data.deposits.toString(),

            withdrawals: data.withdrawals.toString(),

            transfers: data.transfers.toString(),
          })),

        weekly: Array.from(weeklyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([week, data]) => ({
            week,

            count: data.count,

            amount: data.amount.toString(),
          })),

        monthly: Array.from(monthlyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, data]) => ({
            month,

            count: data.count,

            amount: data.amount.toString(),
          })),
      },
    };
  }

  /*
   * ==========================================
   * TRANSACTION MONITORING SUMMARY
   *
   * GET /transactions/monitoring/summary
   *
   * Professional operational statistics for
   * monitoring and compliance dashboards.
   * ==========================================
   */
  async getMonitoringSummary(
    userId: number,
    filters: {
      startDate?: Date;
      endDate?: Date;
      currency?: Currency;
    } = {},
  ) {
    const { startDate, endDate, currency } = filters;

    let transactions = await this.getUserTransactions(userId);

    /*
     * DATE FILTERS
     */
    if (startDate) {
      transactions = transactions.filter((transaction: any) => {
        const transactionDate = new Date(String(transaction.createdAt));

        return transactionDate >= startDate;
      });
    }

    if (endDate) {
      transactions = transactions.filter((transaction: any) => {
        const transactionDate = new Date(String(transaction.createdAt));

        return transactionDate <= endDate;
      });
    }

    /*
     * CURRENCY FILTER
     */
    if (currency) {
      transactions = transactions.filter(
        (transaction: any) => transaction.currency === currency,
      );
    }

    let completedTransactions = 0;

    let pendingTransactions = 0;

    let processingTransactions = 0;

    let failedTransactions = 0;

    let reversedTransactions = 0;

    let depositCount = 0;

    let withdrawalCount = 0;

    let transferCount = 0;

    let totalDepositVolume = 0n;

    let totalWithdrawalVolume = 0n;

    let totalTransferVolume = 0n;

    let totalTransactionVolume = 0n;

    const currencyMap = new Map<
      string,
      {
        transactionCount: number;
        volume: bigint;
        deposits: bigint;
        withdrawals: bigint;
        transfers: bigint;
      }
    >();

    for (const transaction of transactions) {
      const amount = BigInt(transaction.amount ?? 0);

      /*
       * STATUS COUNTS
       */
      if (transaction.status === 'COMPLETED') {
        completedTransactions++;
      }

      if (transaction.status === 'PENDING') {
        pendingTransactions++;
      }

      if (transaction.status === 'PROCESSING') {
        processingTransactions++;
      }

      if (transaction.status === 'FAILED') {
        failedTransactions++;
      }

      if (transaction.status === 'REVERSED') {
        reversedTransactions++;
      }

      /*
       * TRANSACTION TYPE COUNTS
       */
      if (transaction.type === 'DEPOSIT') {
        depositCount++;
      }

      if (transaction.type === 'WITHDRAWAL') {
        withdrawalCount++;
      }

      if (transaction.type === 'TRANSFER') {
        transferCount++;
      }

      /*
       * INITIALIZE CURRENCY DATA
       */
      if (!currencyMap.has(transaction.currency)) {
        currencyMap.set(transaction.currency, {
          transactionCount: 0,
          volume: 0n,
          deposits: 0n,
          withdrawals: 0n,
          transfers: 0n,
        });
      }

      const currencyData = currencyMap.get(transaction.currency)!;

      currencyData.transactionCount++;

      /*
       * Failed and reversed transactions
       * must not contribute to financial
       * volume.
       */
      const isFinanciallyValid =
        transaction.status !== 'FAILED' && transaction.status !== 'REVERSED';

      if (!isFinanciallyValid) {
        continue;
      }

      totalTransactionVolume += amount;

      currencyData.volume += amount;

      /*
       * DEPOSIT
       */
      if (transaction.type === 'DEPOSIT') {
        totalDepositVolume += amount;

        currencyData.deposits += amount;
      }

      /*
       * WITHDRAWAL
       */
      if (transaction.type === 'WITHDRAWAL') {
        totalWithdrawalVolume += amount;

        currencyData.withdrawals += amount;
      }

      /*
       * TRANSFER
       */
      if (transaction.type === 'TRANSFER') {
        totalTransferVolume += amount;

        currencyData.transfers += amount;
      }
    }

    return {
      overview: {
        totalTransactions: transactions.length,

        completedTransactions,

        pendingTransactions,

        processingTransactions,

        failedTransactions,

        reversedTransactions,
      },

      transactionTypes: {
        deposits: depositCount,

        withdrawals: withdrawalCount,

        transfers: transferCount,
      },

      financialVolume: {
        total: totalTransactionVolume.toString(),

        deposits: totalDepositVolume.toString(),

        withdrawals: totalWithdrawalVolume.toString(),

        transfers: totalTransferVolume.toString(),
      },

      currencyBreakdown: Array.from(currencyMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([currencyCode, data]) => ({
          currency: currencyCode,

          transactionCount: data.transactionCount,

          volume: data.volume.toString(),

          deposits: data.deposits.toString(),

          withdrawals: data.withdrawals.toString(),

          transfers: data.transfers.toString(),
        })),
    };
  }

  /*
   * ==========================================
   * TRANSACTION MONITORING
   *
   * GET /transactions/monitoring
   *
   * Supports:
   *
   * - Pagination
   * - Transaction type
   * - Transaction status
   * - Currency
   * - Reference search
   * - Transaction ID search
   * - Date range
   * - Minimum amount
   * - Maximum amount
   * ==========================================
   */
  async getMonitoringTransactions(
    userId: number,
    filters: TransactionFilters = {},
  ) {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      currency,
      search,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = filters;

    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

    const safeLimit =
      Number.isFinite(limit) && limit > 0
        ? Math.min(Math.floor(limit), 100)
        : 20;

    let transactions = await this.getUserTransactions(userId);

    /*
     * TYPE FILTER
     */
    if (type) {
      transactions = transactions.filter(
        (transaction: any) => transaction.type === type,
      );
    }

    /*
     * STATUS FILTER
     */
    if (status) {
      transactions = transactions.filter(
        (transaction: any) => transaction.status === status,
      );
    }

    /*
     * CURRENCY FILTER
     */
    if (currency) {
      transactions = transactions.filter(
        (transaction: any) => transaction.currency === currency,
      );
    }

    /*
     * SEARCH
     */
    if (search && search.trim().length > 0) {
      const normalizedSearch = search.trim().toLowerCase();

      transactions = transactions.filter((transaction: any) => {
        const transactionId = String(transaction.id).toLowerCase();

        const reference = String(transaction.reference ?? '').toLowerCase();

        return (
          transactionId.includes(normalizedSearch) ||
          reference.includes(normalizedSearch)
        );
      });
    }

    /*
     * START DATE
     */
    if (startDate) {
      transactions = transactions.filter((transaction: any) => {
        const transactionDate = new Date(String(transaction.createdAt));

        return transactionDate >= startDate;
      });
    }

    /*
     * END DATE
     */
    if (endDate) {
      transactions = transactions.filter((transaction: any) => {
        const transactionDate = new Date(String(transaction.createdAt));

        return transactionDate <= endDate;
      });
    }

    /*
     * MINIMUM AMOUNT
     */
    if (minAmount !== undefined) {
      transactions = transactions.filter(
        (transaction: any) => BigInt(transaction.amount ?? 0) >= minAmount,
      );
    }

    /*
     * MAXIMUM AMOUNT
     */
    if (maxAmount !== undefined) {
      transactions = transactions.filter(
        (transaction: any) => BigInt(transaction.amount ?? 0) <= maxAmount,
      );
    }

    /*
     * MOST RECENT FIRST
     */
    transactions.sort((a: any, b: any) => {
      const dateA = new Date(String(a.createdAt)).getTime();

      const dateB = new Date(String(b.createdAt)).getTime();

      return dateB - dateA;
    });

    const total = transactions.length;

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    const startIndex = (safePage - 1) * safeLimit;

    const data = transactions.slice(startIndex, startIndex + safeLimit);

    return {
      data: this.serialize(data),

      meta: {
        total,

        page: safePage,

        limit: safeLimit,

        totalPages,

        hasPreviousPage: safePage > 1,

        hasNextPage: safePage < totalPages,
      },
    };
  }

  /*
   * ==========================================
   * GET ISO WEEK KEY
   *
   * Example:
   *
   * 2026-W36
   * ==========================================
   */
  private getWeekKey(date: Date): string {
    const tempDate = new Date(
      Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
    );

    const dayNumber = tempDate.getUTCDay() || 7;

    tempDate.setUTCDate(tempDate.getUTCDate() + 4 - dayNumber);

    const yearStart = new Date(Date.UTC(tempDate.getUTCFullYear(), 0, 1));

    const weekNumber = Math.ceil(
      ((tempDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
    );

    return `${tempDate.getUTCFullYear()}-W${String(weekNumber).padStart(
      2,
      '0',
    )}`;
  }

  /*
   * ==========================================
   * GET ALL TRANSACTIONS
   *
   * Supports:
   *
   * - Pagination
   * - Type filtering
   * - Status filtering
   * - Currency filtering
   * - Search
   * - Date filtering
   * - Amount filtering
   * ==========================================
   */
  async findAll(userId: number, filters: TransactionFilters = {}) {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      currency,
      search,
      startDate,
      endDate,
      minAmount,
      maxAmount,
    } = filters;

    const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;

    const safeLimit =
      Number.isFinite(limit) && limit > 0
        ? Math.min(Math.floor(limit), 100)
        : 10;

    let filteredTransactions = await this.getUserTransactions(userId);

    /*
     * TYPE FILTER
     */
    if (type) {
      filteredTransactions = filteredTransactions.filter(
        (transaction: any) => transaction.type === type,
      );
    }

    /*
     * STATUS FILTER
     */
    if (status) {
      filteredTransactions = filteredTransactions.filter(
        (transaction: any) => transaction.status === status,
      );
    }

    /*
     * CURRENCY FILTER
     */
    if (currency) {
      filteredTransactions = filteredTransactions.filter(
        (transaction: any) => transaction.currency === currency,
      );
    }

    /*
     * SEARCH
     */
    if (search && search.trim().length > 0) {
      const normalizedSearch = search.trim().toLowerCase();

      filteredTransactions = filteredTransactions.filter((transaction: any) => {
        const transactionId = String(transaction.id).toLowerCase();

        const reference = String(transaction.reference ?? '').toLowerCase();

        return (
          transactionId.includes(normalizedSearch) ||
          reference.includes(normalizedSearch)
        );
      });
    }

    /*
     * START DATE
     */
    if (startDate) {
      filteredTransactions = filteredTransactions.filter((transaction: any) => {
        const transactionDate = new Date(String(transaction.createdAt));

        return transactionDate >= startDate;
      });
    }

    /*
     * END DATE
     */
    if (endDate) {
      filteredTransactions = filteredTransactions.filter((transaction: any) => {
        const transactionDate = new Date(String(transaction.createdAt));

        return transactionDate <= endDate;
      });
    }

    /*
     * MINIMUM AMOUNT
     */
    if (minAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter(
        (transaction: any) => BigInt(transaction.amount ?? 0) >= minAmount,
      );
    }

    /*
     * MAXIMUM AMOUNT
     */
    if (maxAmount !== undefined) {
      filteredTransactions = filteredTransactions.filter(
        (transaction: any) => BigInt(transaction.amount ?? 0) <= maxAmount,
      );
    }

    /*
     * MOST RECENT FIRST
     */
    filteredTransactions.sort((a: any, b: any) => {
      const dateA = new Date(String(a.createdAt)).getTime();

      const dateB = new Date(String(b.createdAt)).getTime();

      return dateB - dateA;
    });

    const total = filteredTransactions.length;

    const totalPages = Math.max(1, Math.ceil(total / safeLimit));

    const startIndex = (safePage - 1) * safeLimit;

    const paginatedTransactions = filteredTransactions.slice(
      startIndex,
      startIndex + safeLimit,
    );

    return {
      data: this.serialize(paginatedTransactions),

      meta: {
        total,

        page: safePage,

        limit: safeLimit,

        totalPages,

        hasPreviousPage: safePage > 1,

        hasNextPage: safePage < totalPages,
      },
    };
  }

  /*
   * ==========================================
   * GET TRANSACTION BY ID
   * ==========================================
   */
  async findOne(userId: number, transactionId: number) {
    const transaction = await this.prisma.client.orm.public.Transaction.first({
      id: transactionId,
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    await this.checkTransactionAccess(userId, transaction);

    await this.auditService.create({
      userId,

      action: 'TRANSACTION_VIEWED',

      entity: 'Transaction',

      entityId: String(transaction.id),

      metadata: JSON.stringify({
        transactionId: transaction.id,

        reference: transaction.reference,

        lookupMethod: 'ID',

        type: transaction.type,

        amount: BigInt(transaction.amount).toString(),

        currency: transaction.currency,

        status: transaction.status,
      }),
    });

    return this.serialize(transaction);
  }

  /*
   * ==========================================
   * GET TRANSACTION BY REFERENCE
   * ==========================================
   */
  async findByReference(userId: number, reference: string) {
    const transaction = await this.prisma.client.orm.public.Transaction.first({
      reference,
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    await this.checkTransactionAccess(userId, transaction);

    await this.auditService.create({
      userId,

      action: 'TRANSACTION_VIEWED',

      entity: 'Transaction',

      entityId: String(transaction.id),

      metadata: JSON.stringify({
        transactionId: transaction.id,

        reference: transaction.reference,

        lookupMethod: 'REFERENCE',

        type: transaction.type,

        amount: BigInt(transaction.amount).toString(),

        currency: transaction.currency,

        status: transaction.status,
      }),
    });

    return this.serialize(transaction);
  }

  /*
   * ==========================================
   * GENERATE REVERSAL REFERENCE
   * ==========================================
   */
  private generateReversalReference(originalReference: string): string {
    return `REV-${Date.now()}-${originalReference}`;
  }

  /*
   * ==========================================
   * REVERSE TRANSACTION
   *
   * POST /transactions/:id/reverse
   *
   * Rules:
   *
   * 1. Transaction must exist.
   * 2. Only sender can reverse.
   * 3. Only TRANSFER transactions can reverse.
   * 4. Only COMPLETED transactions can reverse.
   * 5. A reversed transaction cannot reverse again.
   * 6. Destination wallet must have balance.
   * 7. Wallet balances are reversed.
   * 8. Reversal transaction is created.
   * 9. Original transaction becomes REVERSED.
   * 10. Ledger entries are reversed.
   * ==========================================
   */
  async reverse(userId: number, transactionId: number) {
    /*
     * STEP 1
     *
     * Perform wallet and database operations.
     */
    const result = await this.prisma.client.transaction(async (tx) => {
      /*
       * Find original transaction.
       */
      const transaction = await tx.orm.public.Transaction.first({
        id: transactionId,
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      /*
       * Only transfers can currently
       * be reversed.
       */
      if (transaction.type !== 'TRANSFER') {
        throw new BadRequestException(
          'Only transfer transactions can be reversed',
        );
      }

      /*
       * Prevent duplicate reversal.
       */
      if (transaction.status === 'REVERSED') {
        throw new BadRequestException('Transaction has already been reversed');
      }

      /*
       * Only completed transactions
       * can be reversed.
       */
      if (transaction.status !== 'COMPLETED') {
        throw new BadRequestException(
          'Only completed transactions can be reversed',
        );
      }

      /*
       * Validate wallet IDs.
       */
      if (
        transaction.sourceWalletId === null ||
        transaction.destinationWalletId === null
      ) {
        throw new BadRequestException('Invalid transfer transaction');
      }

      /*
       * Find source wallet.
       */
      const sourceWallet = await tx.orm.public.Wallet.first({
        id: transaction.sourceWalletId,
      });

      if (!sourceWallet) {
        throw new NotFoundException('Source wallet not found');
      }

      /*
       * Only sender can reverse.
       */
      if (sourceWallet.userId !== userId) {
        throw new ForbiddenException(
          'Only the sender can reverse this transaction',
        );
      }

      /*
       * Find destination wallet.
       */
      const destinationWallet = await tx.orm.public.Wallet.first({
        id: transaction.destinationWalletId,
      });

      if (!destinationWallet) {
        throw new NotFoundException('Destination wallet not found');
      }

      /*
       * Validate wallet status.
       */
      if (sourceWallet.status !== 'ACTIVE') {
        throw new BadRequestException('Source wallet is not active');
      }

      if (destinationWallet.status !== 'ACTIVE') {
        throw new BadRequestException('Destination wallet is not active');
      }

      /*
       * Validate currencies.
       */
      if (sourceWallet.currency !== destinationWallet.currency) {
        throw new BadRequestException('Wallet currencies do not match');
      }

      const transactionAmount = BigInt(transaction.amount);

      /*
       * Destination wallet must contain
       * enough balance for reversal.
       */
      if (destinationWallet.balance < transactionAmount) {
        throw new BadRequestException(
          'Destination wallet does not have enough balance to reverse this transaction',
        );
      }

      /*
       * Calculate reversal balances.
       *
       * Original:
       *
       * Source      - amount
       * Destination + amount
       *
       * Reversal:
       *
       * Source      + amount
       * Destination - amount
       */
      const sourceNewBalance = sourceWallet.balance + transactionAmount;

      const destinationNewBalance =
        destinationWallet.balance - transactionAmount;

      /*
       * Update source wallet.
       */
      const updatedSourceWallet = await tx.orm.public.Wallet.where({
        id: sourceWallet.id,
      }).update({
        balance: sourceNewBalance,
      });

      /*
       * Update destination wallet.
       */
      const updatedDestinationWallet = await tx.orm.public.Wallet.where({
        id: destinationWallet.id,
      }).update({
        balance: destinationNewBalance,
      });

      /*
       * Create reversal transaction.
       *
       * Direction is reversed:
       *
       * Original:
       * source -> destination
       *
       * Reversal:
       * destination -> source
       */
      const reversalReference = this.generateReversalReference(
        transaction.reference,
      );

      const reversalTransaction = await tx.orm.public.Transaction.create({
        reference: reversalReference,

        type: 'TRANSFER',

        status: 'COMPLETED',

        amount: transactionAmount,

        currency: transaction.currency,

        sourceWalletId: destinationWallet.id,

        destinationWalletId: sourceWallet.id,
      });

      /*
       * Mark original transaction
       * as reversed.
       */
      const reversedOriginalTransaction = await tx.orm.public.Transaction.where(
        {
          id: transaction.id,
        },
      ).update({
        status: 'REVERSED',
      });

      return {
        transaction,

        reversalTransaction,

        originalTransaction: reversedOriginalTransaction,

        sourceWallet: updatedSourceWallet,

        destinationWallet: updatedDestinationWallet,

        amount: transactionAmount,
      };
    });

    /*
     * STEP 2
     *
     * Reverse accounting ledger entries.
     */
    await this.ledgerService.reverseTransaction(
      result.transaction.id,
      result.reversalTransaction.id,
    );

    /*
     * ==========================================
     * AUDIT LOG
     *
     * Record the completed reversal only after
     * the financial and ledger operations have
     * succeeded.
     * ==========================================
     */
    await this.auditService.create({
      userId,

      action: 'TRANSACTION_REVERSED',

      entity: 'Transaction',

      entityId: String(result.transaction.id),

      metadata: JSON.stringify({
        originalTransactionId: result.transaction.id,

        originalReference: result.transaction.reference,

        reversalTransactionId: result.reversalTransaction.id,

        reversalReference: result.reversalTransaction.reference,

        amount: result.amount.toString(),

        currency: result.transaction.currency,

        sourceWalletId: result.transaction.sourceWalletId,

        destinationWalletId: result.transaction.destinationWalletId,

        sourceWalletBalanceAfter: result.sourceWallet
          ? BigInt(result.sourceWallet.balance).toString()
          : null,

        destinationWalletBalanceAfter: result.destinationWallet
          ? BigInt(result.destinationWallet.balance).toString()
          : null,
      }),
    });

    /*
     * RESPONSE
     */
    return {
      message: 'Transaction reversed successfully',

      amount: result.amount.toString(),

      sourceWallet: this.serialize(result.sourceWallet),

      destinationWallet: this.serialize(result.destinationWallet),

      originalTransaction: this.serialize(result.originalTransaction),

      reversalTransaction: this.serialize(result.reversalTransaction),
    };
  }
}
