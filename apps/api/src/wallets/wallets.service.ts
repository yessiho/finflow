import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import { CreateWalletDto } from './dto/create-wallet.dto.js';
import { DepositDto } from './dto/deposit.dto.js';
import { WithdrawDto } from './dto/withdraw.dto.js';
import { TransferDto } from './dto/transfer.dto.js';

type WalletCurrency = 'NGN' | 'USD' | 'EUR' | 'GBP';

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /*
   * ==========================================
   * SERIALIZE DATABASE RESPONSE
   *
   * PostgreSQL / Prisma may return BigInt values.
   * JSON.stringify cannot serialize BigInt directly.
   *
   * Convert:
   *
   * 1000n → "1000"
   *
   * ==========================================
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

  /*
   * ==========================================
   * GENERATE WALLET ACCOUNT NUMBER
   *
   * Demo banking account number.
   *
   * Format:
   *
   * 10 digits
   *
   * Example:
   *
   * 1045827391
   *
   * ==========================================
   */
  private generateAccountNumber(): string {
    const firstDigit = Math.floor(Math.random() * 9) + 1;

    let remainingDigits = '';

    for (let i = 0; i < 9; i++) {
      remainingDigits += Math.floor(
        Math.random() * 10,
      ).toString();
    }

    return `${firstDigit}${remainingDigits}`;
  }

  /*
   * ==========================================
   * GENERATE TRANSACTION REFERENCE
   * ==========================================
   */
  private generateReference(
    prefix: string,
  ): string {
    const timestamp = Date.now();

    const random = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();

    return `${prefix}-${timestamp}-${random}`;
  }

  /*
   * ==========================================
   * GENERATE UNIQUE ACCOUNT NUMBER
   *
   * Check database before returning number.
   *
   * Maximum attempts prevents infinite loops.
   * ==========================================
   */
  private async generateUniqueAccountNumber(): Promise<string> {
    const maxAttempts = 20;

    for (
      let attempt = 0;
      attempt < maxAttempts;
      attempt++
    ) {
      const accountNumber =
        this.generateAccountNumber();

      const existingAccount =
        await this.prisma.client.orm.public.WalletAccount.first({
          accountNumber,
        });

      if (!existingAccount) {
        return accountNumber;
      }
    }

    throw new InternalServerErrorException(
      'Unable to generate a unique account number',
    );
  }

  /*
   * ==========================================
   * GET WALLET OWNER
   *
   * Used when automatically creating
   * a wallet account.
   * ==========================================
   */
  private async getWalletOwner(
    userId: number,
  ) {
    const user =
      await this.prisma.client.orm.public.User.first({
        id: userId,
      });

    if (!user) {
      throw new NotFoundException(
        'Wallet owner not found',
      );
    }

    return user;
  }

  /*
   * ==========================================
   * ENSURE WALLET HAS ACCOUNT
   *
   * This is the most important method.
   *
   * It supports:
   *
   * 1. New wallets
   * 2. Existing wallets
   * 3. Existing users created before
   *    WalletAccount was introduced
   *
   * Logic:
   *
   * Wallet
   *   ↓
   * Does account exist?
   *   ↓
   * YES → Return account
   *
   * NO
   *   ↓
   * Automatically create account
   *
   * ==========================================
   */
  private async ensureWalletAccount(
    wallet: any,
  ) {
    /*
     * First check whether account already exists.
     */
    const existingAccount =
      await this.prisma.client.orm.public.WalletAccount.first({
        walletId: wallet.id,
      });

    if (existingAccount) {
      return existingAccount;
    }

    /*
     * Get wallet owner.
     */
    const user =
      await this.getWalletOwner(
        wallet.userId,
      );

    /*
     * Generate unique account number.
     */
    const accountNumber =
      await this.generateUniqueAccountNumber();

    /*
     * Create account.
     */
    try {
      const account =
        await this.prisma.client.orm.public.WalletAccount.create({
          walletId: wallet.id,

          accountNumber,

          accountName:
            `${user.firstName} ${user.lastName}`.trim(),

          bankName:
            'FinFlow Virtual Bank',

          bankCode:
            'FINFLOW',

          accountType:
            'VIRTUAL',

          status:
            'ACTIVE',
        });

      console.log(
        `Wallet account created automatically for wallet ${wallet.id}`,
      );

      return account;
    } catch (error: any) {
      /*
       * Another request may have created
       * the account at the same time.
       *
       * Re-check before failing.
       */
      const account =
        await this.prisma.client.orm.public.WalletAccount.first({
          walletId: wallet.id,
        });

      if (account) {
        return account;
      }

      console.error(
        'ENSURE WALLET ACCOUNT ERROR:',
        error,
      );

      throw error;
    }
  }

  /*
   * ==========================================
   * CREATE WALLET
   *
   * POST /wallets
   * ==========================================
   */
  async create(
    userId: number,
    createWalletDto: CreateWalletDto,
  ) {
    try {
      const currency =
        createWalletDto.currency as WalletCurrency;

      /*
       * Verify user exists.
       */
      const user =
        await this.getWalletOwner(userId);

      /*
       * Check whether user already has
       * wallet in this currency.
       */
      const existingWallet =
        await this.prisma.client.orm.public.Wallet.first({
          userId,
          currency,
        });

      if (existingWallet) {
        /*
         * Ensure even an old wallet
         * has an account.
         */
        const account =
          await this.ensureWalletAccount(
            existingWallet,
          );

        throw new BadRequestException(
          `You already have a ${currency} wallet`,
        );
      }

      /*
       * Create wallet.
       */
      const wallet =
        await this.prisma.client.orm.public.Wallet.create({
          userId,
          currency,
          balance: 0n,
          status: 'ACTIVE',
        });

      /*
       * Automatically create wallet account.
       */
      const account =
        await this.ensureWalletAccount(
          wallet,
        );

      return this.serialize({
        ...wallet,
        account,
        owner: {
          id: user.id,
          firstName: user.firstName,
          lastName: user.lastName,
        },
      });
    } catch (error) {
      console.error(
        'CREATE WALLET ERROR:',
        error,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Unable to create wallet',
      );
    }
  }

  /*
   * ==========================================
   * GET AUTHENTICATED USER WALLETS
   *
   * GET /wallets
   *
   * IMPORTANT:
   *
   * Existing wallets without accounts will
   * automatically receive accounts here.
   *
   * ==========================================
   */
  async findMyWallets(
    userId: number,
  ) {
    try {
      console.log(
        '==========================================',
      );

      console.log(
        'FETCHING WALLETS FOR USER:',
        userId,
      );

      console.log(
        '==========================================',
      );

      /*
       * Retrieve user wallets.
       */
      const wallets =
        await this.prisma.client.orm.public.Wallet
          .where({
            userId,
          })
          .all();

      console.log(
        'WALLETS FOUND:',
        wallets.length,
      );

      /*
       * Ensure every wallet has an account.
       *
       * This automatically repairs
       * historical wallets.
       */
      const walletsWithAccounts =
        await Promise.all(
          wallets.map(async (wallet) => {
            const account =
              await this.ensureWalletAccount(
                wallet,
              );

            return {
              ...wallet,
              account,
            };
          }),
        );

      console.log(
        'WALLET ACCOUNTS VERIFIED:',
        walletsWithAccounts.length,
      );

      return this.serialize(
        walletsWithAccounts,
      );
    } catch (error) {
      console.error(
        'FIND MY WALLETS ERROR:',
        error,
      );

      throw new InternalServerErrorException(
        'Unable to retrieve wallets',
      );
    }
  }

  /*
   * ==========================================
   * GET SINGLE WALLET
   *
   * GET /wallets/:id
   * ==========================================
   */
  async findOne(
    userId: number,
    walletId: number,
  ) {
    try {
      const wallet =
        await this.prisma.client.orm.public.Wallet.first({
          id: walletId,
          userId,
        });

      if (!wallet) {
        throw new NotFoundException(
          'Wallet not found',
        );
      }

      /*
       * Automatically ensure account exists.
       */
      const account =
        await this.ensureWalletAccount(
          wallet,
        );

      return this.serialize({
        ...wallet,
        account,
      });
    } catch (error) {
      console.error(
        'FIND WALLET ERROR:',
        error,
      );

      if (
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Unable to retrieve wallet',
      );
    }
  }

  /*
   * ==========================================
   * GET WALLET ACCOUNT
   *
   * GET /wallets/:id/account
   *
   * Missing accounts are automatically created.
   *
   * ==========================================
   */
  async getWalletAccount(
    userId: number,
    walletId: number,
  ) {
    try {
      /*
       * Verify ownership.
       */
      const wallet =
        await this.prisma.client.orm.public.Wallet.first({
          id: walletId,
          userId,
        });

      if (!wallet) {
        throw new NotFoundException(
          'Wallet not found',
        );
      }

      /*
       * Ensure account exists.
       */
      const account =
        await this.ensureWalletAccount(
          wallet,
        );

      return this.serialize({
        walletId:
          wallet.id,

        currency:
          wallet.currency,

        accountNumber:
          account.accountNumber,

        accountName:
          account.accountName,

        bankName:
          account.bankName,

        bankCode:
          account.bankCode,

        accountType:
          account.accountType,

        status:
          account.status,

        createdAt:
          account.createdAt,
      });
    } catch (error) {
      console.error(
        'GET WALLET ACCOUNT ERROR:',
        error,
      );

      if (
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Unable to retrieve wallet account',
      );
    }
  }

  /*
   * ==========================================
   * DEPOSIT MONEY
   *
   * POST /wallets/:id/deposit
   * ==========================================
   */
  async deposit(
    userId: number,
    walletId: number,
    depositDto: DepositDto,
  ) {
    try {
      const wallet =
        await this.prisma.client.orm.public.Wallet.first({
          id: walletId,
          userId,
        });

      if (!wallet) {
        throw new NotFoundException(
          'Wallet not found',
        );
      }

      if (
        wallet.status !== 'ACTIVE'
      ) {
        throw new BadRequestException(
          'Wallet is not active',
        );
      }

      const amount =
        BigInt(depositDto.amount);

      if (amount <= 0n) {
        throw new BadRequestException(
          'Deposit amount must be greater than zero',
        );
      }

      const newBalance =
        wallet.balance + amount;

      /*
       * Create transaction.
       */
      const transaction =
        await this.prisma.client.orm.public.Transaction.create({
          reference:
            this.generateReference('DEP'),

          type:
            'DEPOSIT',

          amount,

          currency:
            wallet.currency,

          status:
            'COMPLETED',

          sourceWalletId:
            null,

          destinationWalletId:
            wallet.id,
        });

      /*
       * Update balance.
       */
      const updatedWallet =
        await this.prisma.client.orm.public.Wallet
          .where({
            id: wallet.id,
          })
          .update({
            balance:
              newBalance,
          });

      return this.serialize({
        message:
          'Deposit completed successfully',

        transaction,

        wallet:
          updatedWallet,
      });
    } catch (error) {
      console.error(
        'DEPOSIT ERROR:',
        error,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Unable to complete deposit',
      );
    }
  }

  /*
   * ==========================================
   * WITHDRAW MONEY
   *
   * POST /wallets/:id/withdraw
   * ==========================================
   */
  async withdraw(
    userId: number,
    walletId: number,
    withdrawDto: WithdrawDto,
  ) {
    try {
      const wallet =
        await this.prisma.client.orm.public.Wallet.first({
          id: walletId,
          userId,
        });

      if (!wallet) {
        throw new NotFoundException(
          'Wallet not found',
        );
      }

      if (
        wallet.status !== 'ACTIVE'
      ) {
        throw new BadRequestException(
          'Wallet is not active',
        );
      }

      const amount =
        BigInt(withdrawDto.amount);

      if (amount <= 0n) {
        throw new BadRequestException(
          'Withdrawal amount must be greater than zero',
        );
      }

      if (
        wallet.balance < amount
      ) {
        throw new BadRequestException(
          'Insufficient wallet balance',
        );
      }

      const newBalance =
        wallet.balance - amount;

      /*
       * Create transaction.
       */
      const transaction =
        await this.prisma.client.orm.public.Transaction.create({
          reference:
            this.generateReference('WDL'),

          type:
            'WITHDRAWAL',

          amount,

          currency:
            wallet.currency,

          status:
            'COMPLETED',

          sourceWalletId:
            wallet.id,

          destinationWalletId:
            null,
        });

      /*
       * Update balance.
       */
      const updatedWallet =
        await this.prisma.client.orm.public.Wallet
          .where({
            id: wallet.id,
          })
          .update({
            balance:
              newBalance,
          });

      return this.serialize({
        message:
          'Withdrawal completed successfully',

        transaction,

        wallet:
          updatedWallet,
      });
    } catch (error) {
      console.error(
        'WITHDRAW ERROR:',
        error,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Unable to complete withdrawal',
      );
    }
  }

  /*
   * ==========================================
   * TRANSFER MONEY
   *
   * POST /wallets/:id/transfer
   * ==========================================
   */
  async transfer(
    userId: number,
    sourceWalletId: number,
    transferDto: TransferDto,
  ) {
    try {
      /*
       * Find source wallet.
       */
      const sourceWallet =
        await this.prisma.client.orm.public.Wallet.first({
          id:
            sourceWalletId,

          userId,
        });

      if (!sourceWallet) {
        throw new NotFoundException(
          'Source wallet not found',
        );
      }

      /*
       * Find destination wallet.
       */
      const destinationWallet =
        await this.prisma.client.orm.public.Wallet.first({
          id:
            transferDto.destinationWalletId,
        });

      if (!destinationWallet) {
        throw new NotFoundException(
          'Destination wallet not found',
        );
      }

      /*
       * Prevent same wallet transfer.
       */
      if (
        sourceWallet.id ===
        destinationWallet.id
      ) {
        throw new BadRequestException(
          'Cannot transfer to the same wallet',
        );
      }

      /*
       * Validate wallet status.
       */
      if (
        sourceWallet.status !== 'ACTIVE'
      ) {
        throw new BadRequestException(
          'Source wallet is not active',
        );
      }

      if (
        destinationWallet.status !== 'ACTIVE'
      ) {
        throw new BadRequestException(
          'Destination wallet is not active',
        );
      }

      /*
       * Currency validation.
       */
      if (
        sourceWallet.currency !==
        destinationWallet.currency
      ) {
        throw new BadRequestException(
          'Cross-currency transfers are not supported yet',
        );
      }

      const amount =
        BigInt(transferDto.amount);

      if (amount <= 0n) {
        throw new BadRequestException(
          'Transfer amount must be greater than zero',
        );
      }

      /*
       * Check balance.
       */
      if (
        sourceWallet.balance < amount
      ) {
        throw new BadRequestException(
          'Insufficient wallet balance',
        );
      }

      const sourceNewBalance =
        sourceWallet.balance - amount;

      const destinationNewBalance =
        destinationWallet.balance + amount;

      /*
       * Create transaction.
       */
      const transaction =
        await this.prisma.client.orm.public.Transaction.create({
          reference:
            this.generateReference('TRF'),

          type:
            'TRANSFER',

          amount,

          currency:
            sourceWallet.currency,

          status:
            'COMPLETED',

          sourceWalletId:
            sourceWallet.id,

          destinationWalletId:
            destinationWallet.id,
        });

      /*
       * Update source wallet.
       */
      const updatedSourceWallet =
        await this.prisma.client.orm.public.Wallet
          .where({
            id:
              sourceWallet.id,
          })
          .update({
            balance:
              sourceNewBalance,
          });

      /*
       * Update destination wallet.
       */
      const updatedDestinationWallet =
        await this.prisma.client.orm.public.Wallet
          .where({
            id:
              destinationWallet.id,
          })
          .update({
            balance:
              destinationNewBalance,
          });

      return this.serialize({
        message:
          'Transfer completed successfully',

        transaction,

        sourceWallet:
          updatedSourceWallet,

        destinationWallet:
          updatedDestinationWallet,
      });
    } catch (error) {
      console.error(
        'TRANSFER ERROR:',
        error,
      );

      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Unable to complete transfer',
      );
    }
  }
}