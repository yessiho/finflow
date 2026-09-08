import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
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
    id?: number;
    userId?: number;
    email: string;
    firstName?: string;
    lastName?: string;
    status?: string;
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
   * ==========================================
   */
  private getUserId(
    req: AuthenticatedRequest,
  ): number {
    const userId =
      req.user.id ?? req.user.userId;

    if (!userId) {
      throw new Error(
        'Authenticated user ID is missing',
      );
    }

    return userId;
  }

  /*
   * ==========================================
   * CREATE WALLET
   *
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
    return this.walletsService.create(
      this.getUserId(req),
      createWalletDto,
    );
  }

  /*
   * ==========================================
   * GET MY WALLETS
   *
   * GET /wallets
   * ==========================================
   */
  @Get()
  findMyWallets(
    @Req()
    req: AuthenticatedRequest,
  ) {
    return this.walletsService.findMyWallets(
      this.getUserId(req),
    );
  }

  /*
   * ==========================================
   * GET WALLET ACCOUNT DETAILS
   *
   * GET /wallets/:id/account
   *
   * More specific route should come before
   * GET /wallets/:id.
   * ==========================================
   */
  @Get(':id/account')
  getWalletAccount(
    @Req()
    req: AuthenticatedRequest,

    @Param('id', ParseIntPipe)
    walletId: number,
  ) {
    return this.walletsService.getWalletAccount(
      this.getUserId(req),
      walletId,
    );
  }

  /*
   * ==========================================
   * GET SINGLE WALLET
   *
   * GET /wallets/:id
   * ==========================================
   */
  @Get(':id')
  findOne(
    @Req()
    req: AuthenticatedRequest,

    @Param('id', ParseIntPipe)
    walletId: number,
  ) {
    return this.walletsService.findOne(
      this.getUserId(req),
      walletId,
    );
  }

  /*
   * ==========================================
   * DEPOSIT MONEY
   *
   * POST /wallets/:id/deposit
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
    return this.walletsService.deposit(
      this.getUserId(req),
      walletId,
      depositDto,
    );
  }

  /*
   * ==========================================
   * WITHDRAW MONEY
   *
   * POST /wallets/:id/withdraw
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
    return this.walletsService.withdraw(
      this.getUserId(req),
      walletId,
      withdrawDto,
    );
  }

  /*
   * ==========================================
   * TRANSFER MONEY
   *
   * POST /wallets/:id/transfer
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
    return this.walletsService.transfer(
      this.getUserId(req),
      sourceWalletId,
      transferDto,
    );
  }
}