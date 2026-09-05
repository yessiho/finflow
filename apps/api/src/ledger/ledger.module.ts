import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';

import { LedgerController } from './ledger.controller.js';
import { LedgerService } from './ledger.service.js';

import { PrismaModule } from '../prisma/prisma.module.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

@Module({
  imports: [
    PrismaModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'super-secret-key',
      signOptions: {
        expiresIn: '15m',
      },
    }),
  ],

  controllers: [
    LedgerController,
  ],

  providers: [
    LedgerService,
    JwtAuthGuard,
  ],

  exports: [
    LedgerService,
  ],
})
export class LedgerModule {}