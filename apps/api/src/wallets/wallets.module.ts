import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { WalletsController } from './wallets.controller.js';
import { LedgerModule } from '../ledger/ledger.module.js';
import { WalletsService } from './wallets.service.js';

@Module({
  imports: [AuthModule, LedgerModule],
  controllers: [WalletsController],
  providers: [WalletsService],
})
export class WalletsModule {}