import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { nowInstant } from '../prisma/temporal.js';

import { QueryAdminAccountsDto } from './dto/query-admin-accounts.dto.js';

@Injectable()
export class AdminAccountsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Convert BigInt values into JSON-safe strings.
   */
  private serialize<T>(data: T): T {
    return JSON.parse(
      JSON.stringify(data, (_, value) =>
        typeof value === 'bigint'
          ? value.toString()
          : value,
      ),
    );
  }

  /**
   * Get the wallet belonging to an account.
   */
  private async getWallet(walletId: number) {
    return this.prisma.client.orm.public.Wallet.first({
      id: walletId,
    });
  }

  /**
   * Get the customer owning a wallet.
   */
  private async getCustomer(userId: number) {
    return this.prisma.client.orm.public.User.first({
      id: userId,
    });
  }

  /**
   * Build the admin-safe account response.
   */
  private buildAccount(
    account: any,
    wallet: any,
    customer: any,
  ) {
    return {
      id: account.id,
      accountNumber: account.accountNumber,
      accountName: account.accountName,
      accountType: account.accountType,
      bankCode: account.bankCode,
      bankName: account.bankName,
      status: account.status,

      wallet: wallet
        ? {
            id: wallet.id,
            currency: wallet.currency,
            balance: wallet.balance.toString(),
            status: wallet.status,
          }
        : null,

      customer: customer
        ? {
            id: customer.id,
            firstName: customer.firstName,
            lastName: customer.lastName,
            email: customer.email,
            status: customer.status,
          }
        : null,

      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    };
  }

  /**
   * GET /admin/accounts
   *
   * List virtual wallet accounts for administrators.
   */
  async findAll(query: QueryAdminAccountsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const search = query.search?.trim().toLowerCase();
    const status = query.status;
    const currency = query.currency;
    const accountType = query.accountType?.trim().toLowerCase();

    let accounts =
      await this.prisma.client.orm.public.WalletAccount.all();

    /**
     * Filter by account status.
     */
    if (status) {
      accounts = accounts.filter(
        (account: any) =>
          account.status === status,
      );
    }

    /**
     * Filter by account type.
     */
    if (accountType) {
      accounts = accounts.filter(
        (account: any) =>
          String(account.accountType)
            .toLowerCase()
            .includes(accountType),
      );
    }

    /**
     * Resolve wallets and customers before applying
     * customer/currency search filters.
     */
    const enrichedAccounts = [];

    for (const account of accounts) {
      const wallet = await this.getWallet(
        account.walletId,
      );

      if (!wallet) {
        continue;
      }

      if (
        currency &&
        wallet.currency !== currency
      ) {
        continue;
      }

      const customer = await this.getCustomer(
        wallet.userId,
      );

      if (!customer) {
        continue;
      }

      if (search) {
        const searchableText = [
          String(account.id),
          account.accountNumber,
          account.accountName,
          account.bankName,
          account.bankCode,
          account.accountType,
          wallet.currency,
          String(customer.id),
          customer.email,
          customer.firstName,
          customer.lastName,
          `${customer.firstName} ${customer.lastName}`,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        if (!searchableText.includes(search)) {
          continue;
        }
      }

      enrichedAccounts.push({
        account,
        wallet,
        customer,
      });
    }

    /**
     * Newest accounts first.
     */
    enrichedAccounts.sort((a, b) => {
      return (
        b.account.createdAt.epochMilliseconds -
        a.account.createdAt.epochMilliseconds
      );
    });

    const total = enrichedAccounts.length;

    const start = (page - 1) * limit;

    const paginatedAccounts =
      enrichedAccounts.slice(
        start,
        start + limit,
      );

    const data = paginatedAccounts.map(
      ({ account, wallet, customer }) =>
        this.buildAccount(
          account,
          wallet,
          customer,
        ),
    );

    /**
     * Global account statistics.
     */
    const allAccounts =
      await this.prisma.client.orm.public.WalletAccount.all();

    const statistics = {
      totalAccounts: allAccounts.length,

      activeAccounts: allAccounts.filter(
        (account: any) =>
          account.status === 'ACTIVE',
      ).length,

      frozenAccounts: allAccounts.filter(
        (account: any) =>
          account.status === 'FROZEN',
      ).length,

      closedAccounts: allAccounts.filter(
        (account: any) =>
          account.status === 'CLOSED',
      ).length,
    };

    return {
      data: this.serialize(data),

      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },

      statistics,
    };
  }

  /**
   * GET /admin/accounts/:id
   *
   * Get one account with its wallet and customer.
   */
  async findOne(id: number) {
    const account =
      await this.prisma.client.orm.public.WalletAccount.first({
        id,
      });

    if (!account) {
      throw new NotFoundException(
        'Account not found',
      );
    }

    const wallet = await this.getWallet(
      account.walletId,
    );

    if (!wallet) {
      throw new NotFoundException(
        'Wallet associated with account not found',
      );
    }

    const customer = await this.getCustomer(
      wallet.userId,
    );

    if (!customer) {
      throw new NotFoundException(
        'Customer associated with account not found',
      );
    }

    /**
     * Get transactions belonging to this wallet.
     */
    const transactionIds = new Set<number>();

    const outgoing =
      await this.prisma.client.orm.public.Transaction
        .where({
          sourceWalletId: wallet.id,
        })
        .all();

    for (const transaction of outgoing) {
      transactionIds.add(transaction.id);
    }

    const incoming =
      await this.prisma.client.orm.public.Transaction
        .where({
          destinationWalletId: wallet.id,
        })
        .all();

    for (const transaction of incoming) {
      transactionIds.add(transaction.id);
    }

    const transactions = [];

    for (const transactionId of transactionIds) {
      const transaction =
        await this.prisma.client.orm.public.Transaction.first({
          id: transactionId,
        });

      if (!transaction) {
        continue;
      }

      transactions.push({
        id: transaction.id,
        reference: transaction.reference,
        amount: transaction.amount.toString(),
        currency: transaction.currency,
        type: transaction._type,
        status: transaction.status,
        sourceWalletId:
          transaction.sourceWalletId,
        destinationWalletId:
          transaction.destinationWalletId,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      });
    }

    transactions.sort((a, b) => {
      return (
        b.createdAt.epochMilliseconds -
        a.createdAt.epochMilliseconds
      );
    });

    return this.serialize({
      account: {
        id: account.id,
        accountNumber: account.accountNumber,
        accountName: account.accountName,
        accountType: account.accountType,
        bankCode: account.bankCode,
        bankName: account.bankName,
        status: account.status,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },

      customer: {
        id: customer.id,
        firstName: customer.firstName,
        lastName: customer.lastName,
        email: customer.email,
        status: customer.status,
        createdAt: customer.createdAt,
        updatedAt: customer.updatedAt,
      },

      wallet: {
        id: wallet.id,
        currency: wallet.currency,
        balance: wallet.balance.toString(),
        status: wallet.status,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
      },

      recentTransactions:
        transactions.slice(0, 10),
    });
  }

  /**
   * PATCH /admin/accounts/:id/status
   *
   * Change account status.
   */
  async updateStatus(
    id: number,
    status:
      | 'ACTIVE'
      | 'FROZEN'
      | 'CLOSED',
    adminId: number,
  ) {
    const allowedStatuses = [
      'ACTIVE',
      'FROZEN',
      'CLOSED',
    ];

    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(
        'Invalid account status',
      );
    }

    const account =
      await this.prisma.client.orm.public.WalletAccount.first({
        id,
      });

    if (!account) {
      throw new NotFoundException(
        'Account not found',
      );
    }

    if (account.status === status) {
      return {
        id: account.id,
        status: account.status,
        message: `Account is already ${status}`,
      };
    }

    const previousStatus = account.status;

    const updated =
      await this.prisma.client.orm.public.WalletAccount
        .where({ id })
        .update({
          status,
          updatedAt: nowInstant(),
        });

    if (!updated) {
      throw new NotFoundException(
        'Account could not be updated',
      );
    }

    /**
     * Record the administrator action.
     */
    await this.prisma.client.orm.public.AuditLog.create({
      action: `ACCOUNT_STATUS_${status}`,
      entity: 'WalletAccount',
      entityId: String(id),
      adminId,
      metadata: JSON.stringify({
        previousStatus,
        newStatus: status,
      }),
    });

    return {
      id: updated.id,
      status: updated.status,
      message: `Account status changed to ${status}`,
    };
  }
}