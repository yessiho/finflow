import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { nowInstant } from '../prisma/temporal.js';
import { QueryAdminCustomersDto } from './dto/query-admin-customers.dto.js';

@Injectable()
export class AdminCustomersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Convert a customer into the safe admin-list representation.
   */
  private toCustomer(
    user: any,
    walletCount: number,
    transactionCount: number,
  ) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      status: user.status,
      walletCount,
      transactionCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  /**
   * Get all wallets belonging to a customer.
   */
  private async getWallets(userId: number) {
    return this.prisma.client.orm.public.Wallet
      .where({ userId })
      .all();
  }

  /**
   * Get unique transaction IDs belonging to a customer's wallets.
   *
   * A transaction can appear either as an outgoing or incoming
   * transaction, so both directions are checked.
   */
  private async getTransactionIds(walletIds: number[]) {
    const transactionIds = new Set<number>();

    for (const walletId of walletIds) {
      const outgoingTransactions =
        await this.prisma.client.orm.public.Transaction
          .where({ sourceWalletId: walletId })
          .all();

      for (const transaction of outgoingTransactions) {
        transactionIds.add(transaction.id);
      }

      const incomingTransactions =
        await this.prisma.client.orm.public.Transaction
          .where({ destinationWalletId: walletId })
          .all();

      for (const transaction of incomingTransactions) {
        transactionIds.add(transaction.id);
      }
    }

    return [...transactionIds];
  }

  /**
   * List customers for administrators.
   */
  async findAll(query: QueryAdminCustomersDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const search = query.search?.trim().toLowerCase();
    const status = query.status;

    let users = await this.prisma.client.orm.public.User.all();

    /**
     * Filter by status.
     */
    if (status) {
      users = users.filter(
        (user: any) => user.status === status,
      );
    }

    /**
     * Filter by search term.
     */
    if (search) {
      users = users.filter((user: any) => {
        const searchableText = [
          String(user.id),
          user.email,
          user.firstName,
          user.lastName,
          `${user.firstName} ${user.lastName}`,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(search);
      });
    }

    /**
     * Sort newest customers first.
     */
    users.sort((a: any, b: any) => {
      return (
        b.createdAt.epochMilliseconds -
        a.createdAt.epochMilliseconds
      );
    });

    const total = users.length;

    const start = (page - 1) * limit;
    const paginatedUsers = users.slice(start, start + limit);

    const data = [];

    for (const user of paginatedUsers) {
      const wallets = await this.getWallets(user.id);
      const walletIds = wallets.map((wallet: any) => wallet.id);

      const transactionIds =
        await this.getTransactionIds(walletIds);

      data.push(
        this.toCustomer(
          user,
          wallets.length,
          transactionIds.length,
        ),
      );
    }

    /**
     * Global statistics.
     */
    const allUsers =
      await this.prisma.client.orm.public.User.all();

    const statistics = {
      totalCustomers: allUsers.length,
      activeCustomers: allUsers.filter(
        (user: any) => user.status === 'ACTIVE',
      ).length,
      suspendedCustomers: allUsers.filter(
        (user: any) => user.status === 'SUSPENDED',
      ).length,
      deactivatedCustomers: allUsers.filter(
        (user: any) => user.status === 'DEACTIVATED',
      ).length,
    };

    return {
      data,
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
   * Get one customer's complete admin view.
   */
  async findOne(id: number) {
    const user =
      await this.prisma.client.orm.public.User.first({ id });

    if (!user) {
      throw new NotFoundException('Customer not found');
    }

    const wallets = await this.getWallets(id);

    const walletIds = wallets.map(
      (wallet: any) => wallet.id,
    );

    const transactionIds =
      await this.getTransactionIds(walletIds);

    /**
     * Prepare wallet details.
     */
    const walletDetails = [];

    for (const wallet of wallets) {
      const walletAccount =
        await this.prisma.client.orm.public.WalletAccount.first({
          walletId: wallet.id,
        });

      walletDetails.push({
        id: wallet.id,
        currency: wallet.currency,
        balance: wallet.balance.toString(),
        status: wallet.status,
        createdAt: wallet.createdAt,
        updatedAt: wallet.updatedAt,
        account: walletAccount
          ? {
              id: walletAccount.id,
              accountName: walletAccount.accountName,
              accountNumber: walletAccount.accountNumber,
              accountType: walletAccount.accountType,
              bankCode: walletAccount.bankCode,
              bankName: walletAccount.bankName,
              status: walletAccount.status,
            }
          : null,
      });
    }

    /**
     * Prepare recent transactions.
     */
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
        sourceWalletId: transaction.sourceWalletId,
        destinationWalletId:
          transaction.destinationWalletId,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
      });
    }

    /**
     * Newest transactions first.
     */
    transactions.sort((a, b) => {
      return (
        b.createdAt.epochMilliseconds -
        a.createdAt.epochMilliseconds
      );
    });

    /**
     * Only return the most recent 10 transactions
     * on the customer details page.
     */
    const recentTransactions = transactions.slice(0, 10);

    /**
     * Calculate total wallet balance.
     */
    let totalWalletBalance = 0n;

    for (const wallet of wallets) {
      totalWalletBalance += wallet.balance;
    }

    return {
      profile: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        status: user.status,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },

      summary: {
        walletCount: wallets.length,
        transactionCount: transactionIds.length,
        totalWalletBalance: totalWalletBalance.toString(),
      },

      wallets: walletDetails,

      recentTransactions,
    };
  }

  /**
   * Change a customer's account status.
   */
  async updateStatus(
    customerId: number,
    status: 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED',
    adminId: number,
  ) {
    /**
     * Validate the requested status.
     */
    const allowedStatuses = [
      'ACTIVE',
      'SUSPENDED',
      'DEACTIVATED',
    ];

    if (!allowedStatuses.includes(status)) {
      throw new BadRequestException(
        'Invalid customer status',
      );
    }

    /**
     * Make sure the customer exists.
     */
    const customer =
      await this.prisma.client.orm.public.User.first({
        id: customerId,
      });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    /**
     * Avoid unnecessary database writes.
     */
    if (customer.status === status) {
      return {
        id: customer.id,
        status: customer.status,
        message: `Customer is already ${status}`,
      };
    }

    const previousStatus = customer.status;

    /**
     * Update customer status.
     *
     * IMPORTANT:
     * This project uses Temporal.Instant for Timestamptz
     * fields. Do not replace nowInstant() with new Date().
     */
    const updated =
      await this.prisma.client.orm.public.User
        .where({ id: customerId })
        .update({
          status,
          updatedAt: nowInstant(),
        });

    /**
     * Prisma's generated runtime allows update() to return null,
     * so explicitly guard against that before accessing properties.
     */
    if (!updated) {
      throw new NotFoundException(
        'Customer could not be updated',
      );
    }

    /**
     * Record the administrator action.
     */
    await this.prisma.client.orm.public.AuditLog.create({
      action: `CUSTOMER_STATUS_${status}`,
      entity: 'User',
      entityId: String(customerId),
      userId: customerId,
      adminId,
      metadata: JSON.stringify({
        previousStatus,
        newStatus: status,
      }),
    });

    return {
      id: updated.id,
      status: updated.status,
      message: `Customer status changed to ${status}`,
    };
  }
}