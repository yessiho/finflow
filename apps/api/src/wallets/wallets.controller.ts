import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { WalletsService } from './wallets.service.js';

import { CreateWalletDto } from './dto/create-wallet.dto.js';
import { DepositDto } from './dto/deposit.dto.js';
import { WithdrawDto } from './dto/withdraw.dto.js';
import { TransferDto } from './dto/transfer.dto.js';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

interface AuthenticatedRequest extends Request {
  user: {
    id?: number | string;
    userId?: number | string;
    email: string;
    firstName?: string;
    lastName?: string;
    status?: string;
    type?: 'USER' | 'ADMIN';
  };
}

@Controller('wallets')
@UseGuards(JwtAuthGuard)
export class WalletsController {
  constructor(
    private readonly walletsService: WalletsService,
  ) {}

  /*
   * ==========================================
   * GET AUTHENTICATED USER ID
   *
   * Security:
   * - Supports id and userId for compatibility
   * - Converts numeric strings safely
   * - Rejects invalid IDs
   * - Prevents wallet operations without
   *   a valid authenticated user ID
   * ==========================================
   */
  private getUserId(
    req: AuthenticatedRequest,
  ): number {
    const rawUserId =
      req.user?.id ?? req.user?.userId;

    if (
      rawUserId === undefined ||
      rawUserId === null ||
      rawUserId === ''
    ) {
      throw new BadRequestException(
        'Authenticated user ID is missing',
      );
    }

    const userId = Number(rawUserId);

    if (
      !Number.isSafeInteger(userId) ||
      userId <= 0
    ) {
      throw new BadRequestException(
        'Authenticated user ID is invalid',
      );
    }

    return userId;
  }

  /*
   * ==========================================
   * CREATE WALLET
   * POST /wallets
   * ==========================================
   */
  @Post()
  create(
    @Req()
    req: AuthenticatedRequest,
    @Body()
    createWalletDto: CreateWalletDto,
  ) {
    const userId = this.getUserId(req);

    return this.walletsService.create(
      userId,
      createWalletDto,
    );
  }

  /*
   * ==========================================
   * GET MY WALLETS
   * GET /wallets
   * ==========================================
   */
  @Get()
  findMyWallets(
    @Req()
    req: AuthenticatedRequest,
  ) {
    const userId = this.getUserId(req);

    return this.walletsService.findMyWallets(
      userId,
    );
  }

  /*
   * ==========================================
   * FIND TRANSFER RECIPIENT
   *
   * GET /wallets/recipient?accountNumber=...
   *
   * Account number is used as the recipient
   * identifier.
   * ==========================================
   */
  @Get('recipient')
  findTransferRecipient(
    @Req()
    req: AuthenticatedRequest,
    @Query('accountNumber')
    accountNumber: string,
  ) {
    const userId = this.getUserId(req);

    return this.walletsService.findTransferRecipient(
      userId,
      accountNumber,
    );
  }

  /*
   * ==========================================
   * GET WALLET ACCOUNT
   * GET /wallets/:id/account
   *
   * Security:
   * The authenticated user ID is explicitly
   * passed to the service.
   *
   * The service must verify:
   *
   * wallet.id === walletId
   * AND
   * wallet.userId === userId
   * ==========================================
   */
  @Get(':id/account')
  getWalletAccount(
    @Req()
    req: AuthenticatedRequest,
    @Param('id', ParseIntPipe)
    walletId: number,
  ) {
    const userId = this.getUserId(req);

    console.log(
      'WALLET ACCOUNT AUTH CHECK:',
      {
        authenticatedUserId: userId,
        requestedWalletId: walletId,
        authenticatedUser: {
          id: req.user?.id,
          userId: req.user?.userId,
          email: req.user?.email,
          type: req.user?.type,
        },
      },
    );

    return this.walletsService.getWalletAccount(
      userId,
      walletId,
    );
  }

  /*
   * ==========================================
   * GET SINGLE WALLET
   * GET /wallets/:id
   *
   * Security:
   * Service must verify wallet ownership.
   * ==========================================
   */
  @Get(':id')
  findOne(
    @Req()
    req: AuthenticatedRequest,
    @Param('id', ParseIntPipe)
    walletId: number,
  ) {
    const userId = this.getUserId(req);

    return this.walletsService.findOne(
      userId,
      walletId,
    );
  }

  /*
   * ==========================================
   * DEPOSIT MONEY
   * POST /wallets/:id/deposit
   *
   * Security:
   * Deposit must only operate on a wallet
   * belonging to the authenticated user.
   * ==========================================
   */
  @Post(':id/deposit')
  deposit(
    @Req()
    req: AuthenticatedRequest,
    @Param('id', ParseIntPipe)
    walletId: number,
    @Body()
    depositDto: DepositDto,
  ) {
    const userId = this.getUserId(req);

    return this.walletsService.deposit(
      userId,
      walletId,
      depositDto,
    );
  }

  /*
   * ==========================================
   * WITHDRAW MONEY
   * POST /wallets/:id/withdraw
   *
   * Security:
   * Withdrawal must only operate on a wallet
   * belonging to the authenticated user.
   * ==========================================
   */
  @Post(':id/withdraw')
  withdraw(
    @Req()
    req: AuthenticatedRequest,
    @Param('id', ParseIntPipe)
    walletId: number,
    @Body()
    withdrawDto: WithdrawDto,
  ) {
    const userId = this.getUserId(req);

    return this.walletsService.withdraw(
      userId,
      walletId,
      withdrawDto,
    );
  }

  /*
   * ==========================================
   * TRANSFER MONEY
   * POST /wallets/:id/transfer
   *
   * Security:
   * Source wallet must belong to the
   * authenticated user.
   * ==========================================
   */
  @Post(':id/transfer')
  transfer(
    @Req()
    req: AuthenticatedRequest,
    @Param('id', ParseIntPipe)
    sourceWalletId: number,
    @Body()
    transferDto: TransferDto,
  ) {
    const userId = this.getUserId(req);

    return this.walletsService.transfer(
      userId,
      sourceWalletId,
      transferDto,
    );
  }
}