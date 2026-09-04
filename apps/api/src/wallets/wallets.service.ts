import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { LedgerService } from '../ledger/ledger.service.js';

import { CreateWalletDto } from './dto/create-wallet.dto.js';
import { DepositDto } from './dto/deposit.dto.js';
import { WithdrawDto } from './dto/withdraw.dto.js';
import { TransferDto } from './dto/transfer.dto.js';

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  /*
   * ==========================================
   * CREATE WALLET
   * ==========================================
   */
  async create(
    userId: number,
    createWalletDto: CreateWalletDto,
  ) {
    const { currency } = createWalletDto;

    const existingWallet =
      await this.prisma.client.orm.public.Wallet.first({
        userId,
        currency: currency as 'NGN' | 'USD' | 'EUR' | 'GBP',
      });

    if (existingWallet) {
      throw new ConflictException(
        `You already have a ${currency} wallet`,
      );
    }

    const wallet =
      await this.prisma.client.orm.public.Wallet.create({
        userId,
        currency: currency as 'NGN' | 'USD' | 'EUR' | 'GBP',
        balance: 0n,
        status: 'ACTIVE',
      });

    return this.formatWallet(wallet);
  }

  /*
   * ==========================================
   * GET MY WALLETS
   * ==========================================
   */
  async findMyWallets(userId: number) {
    const wallets =
      await this.prisma.client.orm.public.Wallet.all();

    const userWallets = wallets.filter(
      (wallet) => wallet.userId === userId,
    );

    return userWallets.map((wallet) =>
      this.formatWallet(wallet),
    );
  }

  /*
   * ==========================================
   * DEPOSIT
   * ==========================================
   */
  async deposit(
    userId: number,
    walletId: number,
    depositDto: DepositDto,
  ) {
    const amount = BigInt(depositDto.amount);

    if (amount <= 0n) {
      throw new BadRequestException(
        'Deposit amount must be greater than zero',
      );
    }

    /*
     * Find wallet
     */
    const wallet =
      await this.prisma.client.orm.public.Wallet.first({
        id: walletId,
      });

    if (!wallet) {
      throw new NotFoundException(
        'Wallet not found',
      );
    }

    /*
     * Verify wallet ownership
     */
    if (wallet.userId !== userId) {
      throw new BadRequestException(
        'You do not have access to this wallet',
      );
    }

    /*
     * Check wallet status
     */
    if (wallet.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Wallet is not active',
      );
    }

    /*
     * Calculate new balance
     */
    const newBalance =
      wallet.balance + amount;

    /*
     * Update wallet balance
     */
    const updatedWallet =
      await this.prisma.client.orm.public.Wallet
        .where({
          id: walletId,
        })
        .update({
          balance: newBalance,
        });

    /*
     * Create transaction
     */
    const transaction =
      await this.prisma.client.orm.public.Transaction.create({
        amount,
        currency: wallet.currency,
        destinationWalletId: walletId,
        reference: this.generateReference('DEP'),
        status: 'COMPLETED',
        type: 'DEPOSIT',
      });

    /*
     * POST DEPOSIT TO LEDGER
     *
     * Debit: Cash Account
     * Credit: Customer Wallet Liability
     */
    await this.ledgerService.postDeposit(
      this.prisma.client,
      transaction.id,
      amount,
      wallet.currency,
    );

    return {
      message: 'Deposit successful',

      wallet: this.formatWallet(
        updatedWallet,
      ),

      transaction: this.formatTransaction(
        transaction,
      ),
    };
  }

  /*
   * ==========================================
   * WITHDRAW
   * ==========================================
   */
  async withdraw(
    userId: number,
    walletId: number,
    withdrawDto: WithdrawDto,
  ) {
    const amount = BigInt(withdrawDto.amount);

    if (amount <= 0n) {
      throw new BadRequestException(
        'Withdrawal amount must be greater than zero',
      );
    }

    /*
     * Find wallet
     */
    const wallet =
      await this.prisma.client.orm.public.Wallet.first({
        id: walletId,
      });

    if (!wallet) {
      throw new NotFoundException(
        'Wallet not found',
      );
    }

    /*
     * Verify ownership
     */
    if (wallet.userId !== userId) {
      throw new BadRequestException(
        'You do not have access to this wallet',
      );
    }

    /*
     * Check wallet status
     */
    if (wallet.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Wallet is not active',
      );
    }

    /*
     * Check wallet balance
     */
    if (wallet.balance < amount) {
      throw new BadRequestException(
        'Insufficient wallet balance',
      );
    }

    /*
     * Calculate new balance
     */
    const newBalance =
      wallet.balance - amount;

    /*
     * Update wallet balance
     */
    const updatedWallet =
      await this.prisma.client.orm.public.Wallet
        .where({
          id: walletId,
        })
        .update({
          balance: newBalance,
        });

    /*
     * Create transaction
     */
    const transaction =
      await this.prisma.client.orm.public.Transaction.create({
        amount,
        currency: wallet.currency,
        sourceWalletId: walletId,
        reference: this.generateReference('WTH'),
        status: 'COMPLETED',
        type: 'WITHDRAWAL',
      });

    /*
     * POST WITHDRAWAL TO LEDGER
     *
     * Debit: Customer Wallet Liability
     * Credit: Cash Account
     */
    await this.ledgerService.postWithdrawal(
      this.prisma.client,
      transaction.id,
      amount,
      wallet.currency,
    );

    return {
      message: 'Withdrawal successful',

      wallet: this.formatWallet(
        updatedWallet,
      ),

      transaction: this.formatTransaction(
        transaction,
      ),
    };
  }

  /*
   * ==========================================
   * TRANSFER
   * ==========================================
   */
  async transfer(
    userId: number,
    sourceWalletId: number,
    transferDto: TransferDto,
  ) {
    const {
      destinationWalletId,
      amount,
    } = transferDto;

    /*
     * Prevent transfer to same wallet
     */
    if (
      sourceWalletId ===
      destinationWalletId
    ) {
      throw new BadRequestException(
        'You cannot transfer money to the same wallet',
      );
    }

    const transferAmount =
      BigInt(amount);

    if (transferAmount <= 0n) {
      throw new BadRequestException(
        'Transfer amount must be greater than zero',
      );
    }

    /*
     * Find source wallet
     */
    const sourceWallet =
      await this.prisma.client.orm.public.Wallet.first({
        id: sourceWalletId,
      });

    if (!sourceWallet) {
      throw new NotFoundException(
        'Source wallet not found',
      );
    }

    /*
     * Verify ownership
     */
    if (sourceWallet.userId !== userId) {
      throw new BadRequestException(
        'You do not have access to this wallet',
      );
    }

    /*
     * Check source wallet status
     */
    if (sourceWallet.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Source wallet is not active',
      );
    }

    /*
     * Find destination wallet
     */
    const destinationWallet =
      await this.prisma.client.orm.public.Wallet.first({
        id: destinationWalletId,
      });

    if (!destinationWallet) {
      throw new NotFoundException(
        'Destination wallet not found',
      );
    }

    /*
     * Check destination wallet status
     */
    if (destinationWallet.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Destination wallet is not active',
      );
    }

    /*
     * Prevent cross-currency transfer
     */
    if (
      sourceWallet.currency !==
      destinationWallet.currency
    ) {
      throw new BadRequestException(
        'Wallet currencies must match',
      );
    }

    /*
     * Check source balance
     */
    if (
      sourceWallet.balance <
      transferAmount
    ) {
      throw new BadRequestException(
        'Insufficient wallet balance',
      );
    }

    /*
     * Calculate balances
     */
    const sourceNewBalance =
      sourceWallet.balance -
      transferAmount;

    const destinationNewBalance =
      destinationWallet.balance +
      transferAmount;

    /*
     * Debit source wallet
     */
    const updatedSourceWallet =
      await this.prisma.client.orm.public.Wallet
        .where({
          id: sourceWalletId,
        })
        .update({
          balance: sourceNewBalance,
        });

    /*
     * Credit destination wallet
     */
    const updatedDestinationWallet =
      await this.prisma.client.orm.public.Wallet
        .where({
          id: destinationWalletId,
        })
        .update({
          balance: destinationNewBalance,
        });

    /*
     * Create transaction
     */
    const transaction =
      await this.prisma.client.orm.public.Transaction.create({
        amount: transferAmount,
        currency: sourceWallet.currency,
        sourceWalletId,
        destinationWalletId,
        reference: this.generateReference('TRF'),
        status: 'COMPLETED',
        type: 'TRANSFER',
      });

    /*
     * POST TRANSFER TO LEDGER
     */
    await this.ledgerService.postTransfer(
      this.prisma.client,
      transaction.id,
      transferAmount,
      sourceWallet.currency,
    );

    return {
      message: 'Transfer successful',

      amount:
        transferAmount.toString(),

      sourceWallet:
        this.formatWallet(
          updatedSourceWallet,
        ),

      destinationWallet:
        this.formatWallet(
          updatedDestinationWallet,
        ),

      transaction:
        this.formatTransaction(
          transaction,
        ),
    };
  }

  /*
   * ==========================================
   * GENERATE TRANSACTION REFERENCE
   * ==========================================
   */
  private generateReference(
    prefix: string,
  ) {
    return `${prefix}-${Date.now()}-${Math.floor(
      Math.random() * 10000,
    )}`;
  }

  /*
   * ==========================================
   * FORMAT WALLET RESPONSE
   * ==========================================
   */
  private formatWallet(wallet: any) {
    return {
      ...wallet,
      balance: wallet.balance.toString(),
    };
  }

  /*
   * ==========================================
   * FORMAT TRANSACTION RESPONSE
   * ==========================================
   */
  private formatTransaction(
    transaction: any,
  ) {
    return {
      ...transaction,
      amount: transaction.amount.toString(),
    };
  }
}