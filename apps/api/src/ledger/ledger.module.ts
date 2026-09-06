import { Module } from '@nestjs/common';

import { LedgerController } from './ledger.controller.js';
import { LedgerService } from './ledger.service.js';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],

  controllers: [LedgerController],

  providers: [LedgerService],

  exports: [LedgerService],
})
export class LedgerModule {}