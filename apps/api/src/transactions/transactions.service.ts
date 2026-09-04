import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

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

interface TransactionFilters {
  page?: number;

  limit?: number;

  type?: TransactionType;

  status?: TransactionStatus;

  currency?: Currency;

  search?: string;

  startDate?: Date;

  endDate?: Date;
}

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /*
   * ==========================================
   * BIGINT SERIALIZER
   *
   * Converts BigInt values to strings before
   * sending the response to Express.
   * ==========================================
   */
  private serialize<T>(data: T): T {
    return JSON.parse(
      JSON.stringify(
        data,
        (_, value) =>
          typeof value === 'bigint'
            ? value.toString()
            : value,
      ),
    );
  }

  /*
   * ==========================================
   * GET USER WALLETS
   *
   * Retrieve all wallets and filter by user.
   * ==========================================
   */
  private async getUserWallets(
    userId: number,
  ) {
    const wallets =
      await this.prisma.client.orm.public.Wallet.all();

    return wallets.filter(
      (wallet: any) =>
        wallet.userId === userId,
    );
  }

  /*
   * ==========================================
   * GET USER WALLET IDS
   * ==========================================
   */
  private async getUserWalletIds(
    userId: number,
  ): Promise<number[]> {
    const wallets =
      await this.getUserWallets(userId);

    return wallets.map(
      (wallet: any) => wallet.id,
    );
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
  private async getUserTransactions(
    userId: number,
  ) {
    const walletIds =
      await this.getUserWalletIds(userId);

    if (walletIds.length === 0) {
      return [];
    }

    const transactions =
      await this.prisma.client.orm.public.Transaction.all();

    return transactions.filter(
      (transaction: any) => {
        const hasSourceAccess =
          transaction.sourceWalletId !== null &&
          walletIds.includes(
            transaction.sourceWalletId,
          );

        const hasDestinationAccess =
          transaction.destinationWalletId !== null &&
          walletIds.includes(
            transaction.destinationWalletId,
          );

        return (
          hasSourceAccess ||
          hasDestinationAccess
        );
      },
    );
  }

  /*
   * ==========================================
   * CHECK TRANSACTION ACCESS
   *
   * A user can access a transaction if they own
   * either the source wallet or destination
   * wallet.
   * ==========================================
   */
  private async checkTransactionAccess(
    userId: number,
    transaction: any,
  ) {
    const walletIds =
      await this.getUserWalletIds(userId);

    const hasSourceAccess =
      transaction.sourceWalletId !== null &&
      walletIds.includes(
        transaction.sourceWalletId,
      );

    const hasDestinationAccess =
      transaction.destinationWalletId !== null &&
      walletIds.includes(
        transaction.destinationWalletId,
      );

    if (
      !hasSourceAccess &&
      !hasDestinationAccess
    ) {
      throw new ForbiddenException(
        'You do not have access to this transaction',
      );
    }
  }

  /*
   * ==========================================
   * GET TRANSACTION SUMMARY
   *
   * Reversed transactions are excluded from
   * financial volume calculations.
   *
   * GET /transactions/summary
   * ==========================================
   */
  async getSummary(userId: number) {
    const userTransactions =
      await this.getUserTransactions(userId);

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

    let totalDeposits = BigInt(0);

    let totalWithdrawals = BigInt(0);

    let totalTransfers = BigInt(0);

    let completedTransactions = 0;

    let pendingTransactions = 0;

    let failedTransactions = 0;

    let reversedTransactions = 0;

    for (
      const transaction of userTransactions
    ) {
      /*
       * Count statuses independently.
       */
      if (
        transaction.status === 'COMPLETED'
      ) {
        completedTransactions++;
      }

      if (
        transaction.status === 'PENDING'
      ) {
        pendingTransactions++;
      }

      if (
        transaction.status === 'FAILED'
      ) {
        failedTransactions++;
      }

      if (
        transaction.status === 'REVERSED'
      ) {
        reversedTransactions++;
      }

      /*
       * Reversed transactions must not
       * inflate financial totals.
       */
      if (
        transaction.status === 'REVERSED'
      ) {
        continue;
      }

      const amount = BigInt(
        transaction.amount ?? 0,
      );

      if (
        transaction.type === 'DEPOSIT'
      ) {
        totalDeposits += amount;
      }

      if (
        transaction.type === 'WITHDRAWAL'
      ) {
        totalWithdrawals += amount;
      }

      if (
        transaction.type === 'TRANSFER'
      ) {
        totalTransfers += amount;
      }
    }

    return {
      totalTransactions:
        userTransactions.length,

      totalDeposits:
        totalDeposits.toString(),

      totalWithdrawals:
        totalWithdrawals.toString(),

      totalTransfers:
        totalTransfers.toString(),

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
  async getRecentTransactions(
    userId: number,
    limit = 5,
  ) {
    const safeLimit =
      Number.isInteger(limit) &&
      limit > 0
        ? Math.min(limit, 100)
        : 5;

    const userTransactions =
      await this.getUserTransactions(userId);

    userTransactions.sort(
      (a: any, b: any) => {
        const dateA =
          new Date(
            String(a.createdAt),
          ).getTime();

        const dateB =
          new Date(
            String(b.createdAt),
          ).getTime();

        return dateB - dateA;
      },
    );

    return this.serialize(
      userTransactions.slice(
        0,
        safeLimit,
      ),
    );
  }

  /*
   * ==========================================
   * GET TRANSACTION ANALYTICS
   *
   * GET /transactions/analytics
   *
   * Includes:
   *
   * - Overview
   * - Transaction type breakdown
   * - Transaction status breakdown
   * - Currency breakdown
   * - Daily chart
   * - Weekly chart
   * - Monthly chart
   *
   * Reversed transactions remain visible in
   * status counts but are excluded from
   * financial volume totals.
   * ==========================================
   */
  async getAnalytics(
    userId: number,
    days = 30,
  ) {
    const safeDays =
      Number.isInteger(days) &&
      days > 0
        ? Math.min(days, 365)
        : 30;

    const endDate = new Date();

    const startDate = new Date();

    startDate.setDate(
      endDate.getDate() -
        safeDays +
        1,
    );

    startDate.setHours(
      0,
      0,
      0,
      0,
    );

    const userTransactions =
      await this.getUserTransactions(userId);

    /*
     * Filter transactions by period.
     */
    const transactions =
      userTransactions.filter(
        (transaction: any) => {
          const transactionDate =
            new Date(
              String(
                transaction.createdAt,
              ),
            );

          return (
            transactionDate >= startDate &&
            transactionDate <= endDate
          );
        },
      );

    let totalAmount = BigInt(0);

    let totalDeposits = BigInt(0);

    let totalWithdrawals = BigInt(0);

    let totalTransfers = BigInt(0);

    let completedAmount = BigInt(0);

    const typeMap = new Map<
      TransactionType,
      {
        count: number;
        amount: bigint;
      }
    >();

    const statusMap = new Map<
      TransactionStatus,
      number
    >();

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

    /*
     * Initialize transaction types.
     */
    const transactionTypes: TransactionType[] = [
      'DEPOSIT',
      'WITHDRAWAL',
      'TRANSFER',
    ];

    for (
      const type of transactionTypes
    ) {
      typeMap.set(type, {
        count: 0,
        amount: BigInt(0),
      });
    }

    /*
     * Initialize transaction statuses.
     */
    const transactionStatuses: TransactionStatus[] =
      [
        'PENDING',
        'PROCESSING',
        'COMPLETED',
        'FAILED',
        'REVERSED',
      ];

    for (
      const status of transactionStatuses
    ) {
      statusMap.set(status, 0);
    }

    /*
     * Process transactions.
     */
    for (
      const transaction of transactions
    ) {
      const amount = BigInt(
        transaction.amount ?? 0,
      );

      const type =
        transaction.type as TransactionType;

      const status =
        transaction.status as TransactionStatus;

      const currency =
        transaction.currency;

      /*
       * Status count.
       */
      statusMap.set(
        status,
        (statusMap.get(status) ?? 0) +
          1,
      );

      /*
       * Reversed transactions should not
       * contribute to financial volume.
       */
      const isFinanciallyValid =
        status !== 'REVERSED' &&
        status !== 'FAILED';

      /*
       * Type analytics.
       */
      const typeData =
        typeMap.get(type);

      if (typeData) {
        typeData.count++;

        if (isFinanciallyValid) {
          typeData.amount += amount;
        }
      }

      /*
       * Currency analytics.
       */
      if (!currencyMap.has(currency)) {
        currencyMap.set(currency, {
          count: 0,
          amount: BigInt(0),
        });
      }

      const currencyData =
        currencyMap.get(currency)!;

      currencyData.count++;

      if (isFinanciallyValid) {
        currencyData.amount += amount;
      }

      /*
       * Financial totals.
       */
      if (isFinanciallyValid) {
        totalAmount += amount;

        if (
          type === 'DEPOSIT'
        ) {
          totalDeposits += amount;
        }

        if (
          type === 'WITHDRAWAL'
        ) {
          totalWithdrawals += amount;
        }

        if (
          type === 'TRANSFER'
        ) {
          totalTransfers += amount;
        }

        if (
          status === 'COMPLETED'
        ) {
          completedAmount += amount;
        }
      }

      /*
       * Chart date.
       */
      const transactionDate =
        new Date(
          String(
            transaction.createdAt,
          ),
        );

      /*
       * ======================================
       * DAILY CHART
       * ======================================
       */
      const dayKey =
        transactionDate
          .toISOString()
          .slice(0, 10);

      if (!dailyMap.has(dayKey)) {
        dailyMap.set(dayKey, {
          count: 0,
          amount: BigInt(0),
          deposits: BigInt(0),
          withdrawals: BigInt(0),
          transfers: BigInt(0),
        });
      }

      const dailyData =
        dailyMap.get(dayKey)!;

      dailyData.count++;

      if (isFinanciallyValid) {
        dailyData.amount += amount;

        if (
          type === 'DEPOSIT'
        ) {
          dailyData.deposits += amount;
        }

        if (
          type === 'WITHDRAWAL'
        ) {
          dailyData.withdrawals += amount;
        }

        if (
          type === 'TRANSFER'
        ) {
          dailyData.transfers += amount;
        }
      }

      /*
       * ======================================
       * WEEKLY CHART
       * ======================================
       */
      const weekKey =
        this.getWeekKey(
          transactionDate,
        );

      if (!weeklyMap.has(weekKey)) {
        weeklyMap.set(weekKey, {
          count: 0,
          amount: BigInt(0),
        });
      }

      const weeklyData =
        weeklyMap.get(weekKey)!;

      weeklyData.count++;

      if (isFinanciallyValid) {
        weeklyData.amount += amount;
      }

      /*
       * ======================================
       * MONTHLY CHART
       * ======================================
       */
      const monthKey =
        transactionDate
          .toISOString()
          .slice(0, 7);

      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          count: 0,
          amount: BigInt(0),
        });
      }

      const monthlyData =
        monthlyMap.get(monthKey)!;

      monthlyData.count++;

      if (isFinanciallyValid) {
        monthlyData.amount += amount;
      }
    }

    return {
      period: {
        days: safeDays,

        startDate:
          startDate.toISOString(),

        endDate:
          endDate.toISOString(),
      },

      overview: {
        totalTransactions:
          transactions.length,

        totalAmount:
          totalAmount.toString(),

        totalDeposits:
          totalDeposits.toString(),

        totalWithdrawals:
          totalWithdrawals.toString(),

        totalTransfers:
          totalTransfers.toString(),

        completedAmount:
          completedAmount.toString(),
      },

      byType:
        transactionTypes.map(
          (type) => {
            const data =
              typeMap.get(type)!;

            return {
              type,

              count:
                data.count,

              amount:
                data.amount.toString(),
            };
          },
        ),

      byStatus:
        transactionStatuses.map(
          (status) => ({
            status,

            count:
              statusMap.get(
                status,
              ) ?? 0,
          }),
        ),

      byCurrency:
        Array.from(
          currencyMap.entries(),
        ).map(
          ([
            currency,
            data,
          ]) => ({
            currency,

            count:
              data.count,

            amount:
              data.amount.toString(),
          }),
        ),

      charts: {
        daily:
          Array.from(
            dailyMap.entries(),
          )
            .sort(
              ([a], [b]) =>
                a.localeCompare(b),
            )
            .map(
              ([
                date,
                data,
              ]) => ({
                date,

                count:
                  data.count,

                amount:
                  data.amount.toString(),

                deposits:
                  data.deposits.toString(),

                withdrawals:
                  data.withdrawals.toString(),

                transfers:
                  data.transfers.toString(),
              }),
            ),

        weekly:
          Array.from(
            weeklyMap.entries(),
          )
            .sort(
              ([a], [b]) =>
                a.localeCompare(b),
            )
            .map(
              ([
                week,
                data,
              ]) => ({
                week,

                count:
                  data.count,

                amount:
                  data.amount.toString(),
              }),
            ),

        monthly:
          Array.from(
            monthlyMap.entries(),
          )
            .sort(
              ([a], [b]) =>
                a.localeCompare(b),
            )
            .map(
              ([
                month,
                data,
              ]) => ({
                month,

                count:
                  data.count,

                amount:
                  data.amount.toString(),
              }),
            ),
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
  private getWeekKey(
    date: Date,
  ): string {
    const tempDate =
      new Date(
        Date.UTC(
          date.getFullYear(),
          date.getMonth(),
          date.getDate(),
        ),
      );

    const dayNumber =
      tempDate.getUTCDay() || 7;

    tempDate.setUTCDate(
      tempDate.getUTCDate() +
        4 -
        dayNumber,
    );

    const yearStart =
      new Date(
        Date.UTC(
          tempDate.getUTCFullYear(),
          0,
          1,
        ),
      );

    const weekNumber =
      Math.ceil(
        ((tempDate.getTime() -
          yearStart.getTime()) /
          86400000 +
          1) /
          7,
      );

    return `${tempDate.getUTCFullYear()}-W${String(
      weekNumber,
    ).padStart(2, '0')}`;
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
   * ==========================================
   */
  async findAll(
    userId: number,
    filters: TransactionFilters = {},
  ) {
    const {
      page = 1,
      limit = 10,
      type,
      status,
      currency,
      search,
      startDate,
      endDate,
    } = filters;

    const safePage =
      Number.isFinite(page) &&
      page > 0
        ? Math.floor(page)
        : 1;

    const safeLimit =
      Number.isFinite(limit) &&
      limit > 0
        ? Math.min(
            Math.floor(limit),
            100,
          )
        : 10;

    let filteredTransactions =
      await this.getUserTransactions(
        userId,
      );

    /*
     * FILTER BY TYPE
     */
    if (type) {
      filteredTransactions =
        filteredTransactions.filter(
          (transaction: any) =>
            transaction.type === type,
        );
    }

    /*
     * FILTER BY STATUS
     */
    if (status) {
      filteredTransactions =
        filteredTransactions.filter(
          (transaction: any) =>
            transaction.status === status,
        );
    }

    /*
     * FILTER BY CURRENCY
     */
    if (currency) {
      filteredTransactions =
        filteredTransactions.filter(
          (transaction: any) =>
            transaction.currency === currency,
        );
    }

    /*
     * SEARCH
     *
     * Search by:
     *
     * - Transaction ID
     * - Transaction reference
     */
    if (
      search &&
      search.trim().length > 0
    ) {
      const normalizedSearch =
        search.trim().toLowerCase();

      filteredTransactions =
        filteredTransactions.filter(
          (transaction: any) => {
            const transactionId =
              String(
                transaction.id,
              ).toLowerCase();

            const reference =
              String(
                transaction.reference ?? '',
              ).toLowerCase();

            return (
              transactionId.includes(
                normalizedSearch,
              ) ||
              reference.includes(
                normalizedSearch,
              )
            );
          },
        );
    }

    /*
     * FILTER BY START DATE
     */
    if (startDate) {
      filteredTransactions =
        filteredTransactions.filter(
          (transaction: any) => {
            const transactionDate =
              new Date(
                String(
                  transaction.createdAt,
                ),
              );

            return (
              transactionDate >= startDate
            );
          },
        );
    }

    /*
     * FILTER BY END DATE
     */
    if (endDate) {
      filteredTransactions =
        filteredTransactions.filter(
          (transaction: any) => {
            const transactionDate =
              new Date(
                String(
                  transaction.createdAt,
                ),
              );

            return (
              transactionDate <= endDate
            );
          },
        );
    }

    /*
     * SORT NEWEST FIRST
     */
    filteredTransactions.sort(
      (a: any, b: any) => {
        const dateA =
          new Date(
            String(a.createdAt),
          ).getTime();

        const dateB =
          new Date(
            String(b.createdAt),
          ).getTime();

        return dateB - dateA;
      },
    );

    /*
     * PAGINATION
     */
    const total =
      filteredTransactions.length;

    const totalPages =
      Math.max(
        1,
        Math.ceil(
          total / safeLimit,
        ),
      );

    const startIndex =
      (safePage - 1) *
      safeLimit;

    const paginatedTransactions =
      filteredTransactions.slice(
        startIndex,
        startIndex + safeLimit,
      );

    return {
      data: this.serialize(
        paginatedTransactions,
      ),

      meta: {
        total,

        page: safePage,

        limit: safeLimit,

        totalPages,
      },
    };
  }

  /*
   * ==========================================
   * GET TRANSACTION BY ID
   * ==========================================
   */
  async findOne(
    userId: number,
    transactionId: number,
  ) {
    const transaction =
      await this.prisma.client.orm.public.Transaction.first({
        id: transactionId,
      });

    if (!transaction) {
      throw new NotFoundException(
        'Transaction not found',
      );
    }

    await this.checkTransactionAccess(
      userId,
      transaction,
    );

    return this.serialize(
      transaction,
    );
  }

  /*
   * ==========================================
   * GET TRANSACTION BY REFERENCE
   * ==========================================
   */
  async findByReference(
    userId: number,
    reference: string,
  ) {
    const transaction =
      await this.prisma.client.orm.public.Transaction.first({
        reference,
      });

    if (!transaction) {
      throw new NotFoundException(
        'Transaction not found',
      );
    }

    await this.checkTransactionAccess(
      userId,
      transaction,
    );

    return this.serialize(
      transaction,
    );
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
   * 2. User must own the source wallet.
   * 3. Only TRANSFER transactions can reverse.
   * 4. Only COMPLETED transfers can reverse.
   * 5. Reversed transfers cannot reverse again.
   * 6. Destination wallet must have sufficient
   *    balance.
   * 7. Both wallet balances and transaction
   *    status update atomically.
   * ==========================================
   */
  async reverse(
    userId: number,
    transactionId: number,
  ) {
    return this.prisma.client.transaction(
      async (tx) => {
        /*
         * Find transaction.
         */
        const transaction =
          await tx.orm.public.Transaction.first({
            id: transactionId,
          });

        if (!transaction) {
          throw new NotFoundException(
            'Transaction not found',
          );
        }

        /*
         * Validate transaction type.
         */
        if (
          transaction.type !== 'TRANSFER'
        ) {
          throw new BadRequestException(
            'Only transfer transactions can be reversed',
          );
        }

        /*
         * Prevent duplicate reversal.
         */
        if (
          transaction.status === 'REVERSED'
        ) {
          throw new BadRequestException(
            'Transaction has already been reversed',
          );
        }

        /*
         * Only completed transactions
         * can be reversed.
         */
        if (
          transaction.status !== 'COMPLETED'
        ) {
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
          throw new BadRequestException(
            'Invalid transfer transaction',
          );
        }

        /*
         * Find source wallet.
         */
        const sourceWallet =
          await tx.orm.public.Wallet.first({
            id: transaction.sourceWalletId,
          });

        if (!sourceWallet) {
          throw new NotFoundException(
            'Source wallet not found',
          );
        }

        /*
         * Only the sender can reverse.
         */
        if (
          sourceWallet.userId !== userId
        ) {
          throw new ForbiddenException(
            'Only the sender can reverse this transaction',
          );
        }

        /*
         * Find destination wallet.
         */
        const destinationWallet =
          await tx.orm.public.Wallet.first({
            id: transaction.destinationWalletId,
          });

        if (!destinationWallet) {
          throw new NotFoundException(
            'Destination wallet not found',
          );
        }

        /*
         * Check wallet statuses.
         */
        if (
          sourceWallet.status !== 'ACTIVE'
        ) {
          throw new BadRequestException(
            'Source wallet is not active',
          );
        }

        if (
          destinationWallet.status !==
          'ACTIVE'
        ) {
          throw new BadRequestException(
            'Destination wallet is not active',
          );
        }

        /*
         * Validate currency consistency.
         */
        if (
          sourceWallet.currency !==
          destinationWallet.currency
        ) {
          throw new BadRequestException(
            'Wallet currencies do not match',
          );
        }

        /*
         * Transaction amount.
         */
        const transactionAmount =
          BigInt(
            transaction.amount,
          );

        /*
         * Destination wallet must still
         * contain enough funds.
         */
        if (
          destinationWallet.balance <
          transactionAmount
        ) {
          throw new BadRequestException(
            'Destination wallet does not have enough balance to reverse this transaction',
          );
        }

        /*
         * Calculate reversed balances.
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
        const sourceNewBalance =
          sourceWallet.balance +
          transactionAmount;

        const destinationNewBalance =
          destinationWallet.balance -
          transactionAmount;

        /*
         * Credit source wallet.
         */
        const updatedSourceWallet =
          await tx.orm.public.Wallet
            .where({
              id: sourceWallet.id,
            })
            .update({
              balance: sourceNewBalance,
            });

        /*
         * Debit destination wallet.
         */
        const updatedDestinationWallet =
          await tx.orm.public.Wallet
            .where({
              id: destinationWallet.id,
            })
            .update({
              balance: destinationNewBalance,
            });

        /*
         * Mark transaction as reversed.
         */
        const reversedTransaction =
          await tx.orm.public.Transaction
            .where({
              id: transaction.id,
            })
            .update({
              status: 'REVERSED',
            });

        return {
          message:
            'Transaction reversed successfully',

          amount:
            transactionAmount.toString(),

          sourceWallet:
            this.serialize(
              updatedSourceWallet,
            ),

          destinationWallet:
            this.serialize(
              updatedDestinationWallet,
            ),

          transaction:
            this.serialize(
              reversedTransaction,
            ),
        };
      },
    );
  }
}