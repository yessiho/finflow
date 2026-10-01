import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { QueryAdminTransactionsDto } from './dto/query-admin-transactions.dto.js';

@Injectable()
export class AdminTransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(value: unknown): unknown {
    if (typeof value === 'bigint') {
      return value.toString();
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (
      value &&
      typeof value === 'object' &&
      'epochMilliseconds' in value
    ) {
      const epochMilliseconds = (
        value as {
          epochMilliseconds?: unknown;
        }
      ).epochMilliseconds;

      if (
        typeof epochMilliseconds === 'number' &&
        Number.isFinite(epochMilliseconds)
      ) {
        return new Date(
          epochMilliseconds,
        ).toISOString();
      }
    }

    if (Array.isArray(value)) {
      return value.map((item) =>
        this.serialize(item),
      );
    }

    if (
      value &&
      typeof value === 'object'
    ) {
      const result: Record<string, unknown> = {};

      for (const [key, item] of Object.entries(
        value as Record<string, unknown>,
      )) {
        result[key] = this.serialize(item);
      }

      return result;
    }

    return value;
  }

  private getTransactionType(
    transaction: any,
  ): string {
    return transaction._type ?? transaction.type;
  }

  private async getWallet(
    walletId: number | null,
  ) {
    if (!walletId) {
      return null;
    }

    return this.prisma.client.orm.public.Wallet.first({
      id: walletId,
    });
  }

  private async getCustomer(
    userId: number | null,
  ) {
    if (!userId) {
      return null;
    }

    return this.prisma.client.orm.public.User.first({
      id: userId,
    });
  }

  private async buildTransaction(
    transaction: any,
  ) {
    const sourceWallet =
      await this.getWallet(
        transaction.sourceWalletId,
      );

    const destinationWallet =
      await this.getWallet(
        transaction.destinationWalletId,
      );

    const customerId =
      sourceWallet?.userId ??
      destinationWallet?.userId ??
      null;

    const customer =
      await this.getCustomer(customerId);

    return {
      id: transaction.id,
      reference: transaction.reference,
      type: this.getTransactionType(
        transaction,
      ),
      amount: transaction.amount,
      currency: transaction.currency,
      status: transaction.status,
      createdAt: transaction.createdAt,
      updatedAt: transaction.updatedAt,

      customer: customer
        ? {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            status: customer.status,
          }
        : null,

      sourceWallet: sourceWallet
        ? {
            id: sourceWallet.id,
            currency: sourceWallet.currency,
            balance: sourceWallet.balance,
            status: sourceWallet.status,
          }
        : null,

      destinationWallet:
        destinationWallet
          ? {
              id: destinationWallet.id,
              currency:
                destinationWallet.currency,
              balance:
                destinationWallet.balance,
              status:
                destinationWallet.status,
            }
          : null,
    };
  }

  async findAll(
    query: QueryAdminTransactionsDto,
  ) {
    const {
      search,
      status,
      type,
      currency,
      page = 1,
      limit = 20,
    } = query;

    const transactions =
      await this.prisma.client.orm.public.Transaction.all();

    const normalizedSearch =
      search?.trim().toLowerCase();

    const filtered: Array<{
      transaction: any;
      sourceWallet: any;
      destinationWallet: any;
      customer: any;
    }> = [];

    for (const transaction of transactions) {
      const transactionType =
        this.getTransactionType(
          transaction,
        );

      if (
        status &&
        transaction.status !== status
      ) {
        continue;
      }

      if (
        type &&
        transactionType !== type
      ) {
        continue;
      }

      if (
        currency &&
        transaction.currency !== currency
      ) {
        continue;
      }

      const sourceWallet =
        await this.getWallet(
          transaction.sourceWalletId,
        );

      const destinationWallet =
        await this.getWallet(
          transaction.destinationWalletId,
        );

      const customerId =
        sourceWallet?.userId ??
        destinationWallet?.userId ??
        null;

      const customer =
        await this.getCustomer(customerId);

      if (normalizedSearch) {
        const searchable = [
          String(transaction.id),
          transaction.reference,
          transactionType,
          transaction.currency,
          transaction.status,
          customer?.email,
          customer?.firstName,
          customer?.lastName,
          sourceWallet?.currency,
          destinationWallet?.currency,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (
          !searchable.includes(
            normalizedSearch,
          )
        ) {
          continue;
        }
      }

      filtered.push({
        transaction,
        sourceWallet,
        destinationWallet,
        customer,
      });
    }

    filtered.sort(
      (a, b) =>
        b.transaction.createdAt
          .epochMilliseconds -
        a.transaction.createdAt
          .epochMilliseconds,
    );

    const total = filtered.length;
    const skip = (page - 1) * limit;
    const paginated = filtered.slice(
      skip,
      skip + limit,
    );

    const data = paginated.map(
      ({
        transaction,
        sourceWallet,
        destinationWallet,
        customer,
      }) => ({
        id: transaction.id,
        reference: transaction.reference,
        type: this.getTransactionType(
          transaction,
        ),
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,

        customer: customer
          ? {
              id: customer.id,
              firstName:
                customer.firstName,
              lastName:
                customer.lastName,
              email: customer.email,
              status:
                customer.status,
            }
          : null,

        sourceWallet:
          sourceWallet
            ? {
                id: sourceWallet.id,
                currency:
                  sourceWallet.currency,
                status:
                  sourceWallet.status,
              }
            : null,

        destinationWallet:
          destinationWallet
            ? {
                id: destinationWallet.id,
                currency:
                  destinationWallet.currency,
                status:
                  destinationWallet.status,
              }
            : null,
      }),
    );

    const statistics = {
      totalTransactions: total,

      pendingTransactions:
        filtered.filter(
          ({ transaction }) =>
            transaction.status ===
            'PENDING',
        ).length,

      completedTransactions:
        filtered.filter(
          ({ transaction }) =>
            transaction.status ===
            'COMPLETED',
        ).length,

      failedTransactions:
        filtered.filter(
          ({ transaction }) =>
            transaction.status ===
            'FAILED',
        ).length,

      reversedTransactions:
        filtered.filter(
          ({ transaction }) =>
            transaction.status ===
            'REVERSED',
        ).length,
    };

    return this.serialize({
      data,

      pagination: {
        page,
        limit,
        total,
        totalPages:
          Math.ceil(
            total / limit,
          ),
      },

      statistics,
    });
  }

  async findOne(id: number) {
    const transaction =
      await this.prisma.client.orm.public.Transaction.first({
        id,
      });

    if (!transaction) {
      throw new NotFoundException(
        'Transaction not found',
      );
    }

    const result =
      await this.buildTransaction(
        transaction,
      );

    const ledgerEntries =
      await this.prisma.client.orm.public.LedgerEntry
        .where({
          transactionId: id,
        })
        .all();

    /**
     * Enrich each ledger entry with its
     * actual LedgerAccount information.
     */
    const enrichedLedgerEntries = [];

    for (const entry of ledgerEntries) {
      const account =
        await this.prisma.client.orm.public.LedgerAccount.first({
          id: entry.accountId,
        });

      enrichedLedgerEntries.push({
        id: entry.id,
        transactionId:
          entry.transactionId,
        accountId:
          entry.accountId,

        account: account
          ? {
              id: account.id,
              code: account.code,
              name: account.name,
              type: account._type,
              currency:
                account.currency,
              active: account.active,
            }
          : null,

        debit: entry.debit,
        credit: entry.credit,
        createdAt: entry.createdAt,
      });
    }

    return this.serialize({
      transaction: result,
      ledgerEntries:
        enrichedLedgerEntries,
    });
  }
}