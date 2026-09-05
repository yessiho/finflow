import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AuditService } from '../audit/audit.service.js';
import { LedgerService } from '../ledger/ledger.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

import { CreateWalletDto } from './dto/create-wallet.dto.js';
import { DepositDto } from './dto/deposit.dto.js';
import { TransferDto } from './dto/transfer.dto.js';
import { WithdrawDto } from './dto/withdraw.dto.js';

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
    private readonly auditService: AuditService,
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
        currency:
          currency as 'NGN' | 'USD' | 'EUR' | 'GBP',
      });

    if (existingWallet) {
      throw new ConflictException(
        `You already have a ${currency} wallet`,
      );
    }

    const wallet =
      await this.prisma.client.orm.public.Wallet.create({
        userId,
        currency:
          currency as 'NGN' | 'USD' | 'EUR' | 'GBP',
        balance: 0n,
        status: 'ACTIVE',
      });

    /*
     * ==========================================
     * AUDIT LOG
     * ==========================================
     */
    await this.auditService.create({
      userId,

      action: 'WALLET_CREATED',

      entity: 'WALLET',

      entityId: wallet.id.toString(),

      metadata: JSON.stringify({
        walletId: wallet.id,
        currency: wallet.currency,
        status: wallet.status,
        balance: wallet.balance.toString(),
      }),
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
     * ==========================================
     * FIND WALLET
     * ==========================================
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
     * ==========================================
     * VERIFY WALLET OWNERSHIP
     * ==========================================
     */
    if (wallet.userId !== userId) {
      throw new BadRequestException(
        'You do not have access to this wallet',
      );
    }

    /*
     * ==========================================
     * CHECK WALLET STATUS
     * ==========================================
     */
    if (wallet.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Wallet is not active',
      );
    }

    /*
     * ==========================================
     * CALCULATE NEW BALANCE
     * ==========================================
     */
    const previousBalance = wallet.balance;

    const newBalance =
      wallet.balance + amount;

    /*
     * ==========================================
     * UPDATE WALLET BALANCE
     * ==========================================
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
     * ==========================================
     * CREATE TRANSACTION
     * ==========================================
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
     * ==========================================
     * POST DEPOSIT TO LEDGER
     *
     * Debit: Cash Account
     * Credit: Customer Wallet Liability
     * ==========================================
     */
    await this.ledgerService.postDeposit(
      this.prisma.client,
      transaction.id,
      amount,
      wallet.currency,
    );

    /*
     * ==========================================
     * AUDIT LOG
     * ==========================================
     */
    await this.auditService.create({
      userId,

      action: 'DEPOSIT_COMPLETED',

      entity: 'TRANSACTION',

      entityId: transaction.id.toString(),

      metadata: JSON.stringify({
        transactionId: transaction.id,
        reference: transaction.reference,
        walletId,
        currency: wallet.currency,
        amount: amount.toString(),
        previousBalance:
          previousBalance.toString(),
        newBalance:
          newBalance.toString(),
        status: transaction.status,
        type: transaction.type,
      }),
    });

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
     * ==========================================
     * FIND WALLET
     * ==========================================
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
     * ==========================================
     * VERIFY OWNERSHIP
     * ==========================================
     */
    if (wallet.userId !== userId) {
      throw new BadRequestException(
        'You do not have access to this wallet',
      );
    }

    /*
     * ==========================================
     * CHECK WALLET STATUS
     * ==========================================
     */
    if (wallet.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Wallet is not active',
      );
    }

    /*
     * ==========================================
     * CHECK WALLET BALANCE
     * ==========================================
     */
    if (wallet.balance < amount) {
      throw new BadRequestException(
        'Insufficient wallet balance',
      );
    }

    /*
     * ==========================================
     * CALCULATE NEW BALANCE
     * ==========================================
     */
    const previousBalance = wallet.balance;

    const newBalance =
      wallet.balance - amount;

    /*
     * ==========================================
     * UPDATE WALLET BALANCE
     * ==========================================
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
     * ==========================================
     * CREATE TRANSACTION
     * ==========================================
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
     * ==========================================
     * POST WITHDRAWAL TO LEDGER
     *
     * Debit: Customer Wallet Liability
     * Credit: Cash Account
     * ==========================================
     */
    await this.ledgerService.postWithdrawal(
      this.prisma.client,
      transaction.id,
      amount,
      wallet.currency,
    );

    /*
     * ==========================================
     * AUDIT LOG
     * ==========================================
     */
    await this.auditService.create({
      userId,

      action: 'WITHDRAWAL_COMPLETED',

      entity: 'TRANSACTION',

      entityId: transaction.id.toString(),

      metadata: JSON.stringify({
        transactionId: transaction.id,
        reference: transaction.reference,
        walletId,
        currency: wallet.currency,
        amount: amount.toString(),
        previousBalance:
          previousBalance.toString(),
        newBalance:
          newBalance.toString(),
        status: transaction.status,
        type: transaction.type,
      }),
    });

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
     * ==========================================
     * PREVENT TRANSFER TO SAME WALLET
     * ==========================================
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
     * ==========================================
     * FIND SOURCE WALLET
     * ==========================================
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
     * ==========================================
     * VERIFY SOURCE WALLET OWNERSHIP
     * ==========================================
     */
    if (sourceWallet.userId !== userId) {
      throw new BadRequestException(
        'You do not have access to this wallet',
      );
    }

    /*
     * ==========================================
     * CHECK SOURCE WALLET STATUS
     * ==========================================
     */
    if (sourceWallet.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Source wallet is not active',
      );
    }

    /*
     * ==========================================
     * FIND DESTINATION WALLET
     * ==========================================
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
     * ==========================================
     * CHECK DESTINATION WALLET STATUS
     * ==========================================
     */
    if (destinationWallet.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Destination wallet is not active',
      );
    }

    /*
     * ==========================================
     * PREVENT CROSS-CURRENCY TRANSFER
     * ==========================================
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
     * ==========================================
     * CHECK SOURCE BALANCE
     * ==========================================
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
     * ==========================================
     * CALCULATE NEW BALANCES
     * ==========================================
     */
    const sourcePreviousBalance =
      sourceWallet.balance;

    const destinationPreviousBalance =
      destinationWallet.balance;

    const sourceNewBalance =
      sourceWallet.balance -
      transferAmount;

    const destinationNewBalance =
      destinationWallet.balance +
      transferAmount;

    /*
     * ==========================================
     * DEBIT SOURCE WALLET
     * ==========================================
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
     * ==========================================
     * CREDIT DESTINATION WALLET
     * ==========================================
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
     * ==========================================
     * CREATE TRANSACTION
     * ==========================================
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
     * ==========================================
     * POST TRANSFER TO LEDGER
     * ==========================================
     */
    await this.ledgerService.postTransfer(
      this.prisma.client,
      transaction.id,
      transferAmount,
      sourceWallet.currency,
    );

    /*
     * ==========================================
     * AUDIT LOG
     * ==========================================
     */
    await this.auditService.create({
      userId,

      action: 'TRANSFER_COMPLETED',

      entity: 'TRANSACTION',

      entityId: transaction.id.toString(),

      metadata: JSON.stringify({
        transactionId: transaction.id,
        reference: transaction.reference,
        currency: transaction.currency,
        amount: transferAmount.toString(),

        sourceWallet: {
          walletId: sourceWalletId,
          previousBalance:
            sourcePreviousBalance.toString(),
          newBalance:
            sourceNewBalance.toString(),
        },

        destinationWallet: {
          walletId: destinationWalletId,
          previousBalance:
            destinationPreviousBalance.toString(),
          newBalance:
            destinationNewBalance.toString(),
        },

        status: transaction.status,
        type: transaction.type,
      }),
    });

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