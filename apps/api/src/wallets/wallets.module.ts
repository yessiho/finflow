import {
  Module,
} from '@nestjs/common';

import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../audit/audit.module.js';
import { LedgerModule } from '../ledger/ledger.module.js';

import { WalletsController } from './wallets.controller.js';
import { WalletsService } from './wallets.service.js';

@Module({
  imports: [
    AuthModule,
    LedgerModule,
    AuditModule,
  ],

  controllers: [
    WalletsController,
  ],

  providers: [
    WalletsService,
  ],
})
export class WalletsModule {}