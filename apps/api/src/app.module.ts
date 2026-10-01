import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { AuthModule } from './auth/auth.module.js';
import { AdminsModule } from './admins/admins.module.js';
import { RbacModule } from './rbac/rbac.module.js';

import { WalletsModule } from './wallets/wallets.module.js';
import { LedgerModule } from './ledger/ledger.module.js';
import { AuditModule } from './audit/audit.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { AdminCustomersModule } from './admin-customers/admin-customers.module.js';
import { AdminAccountsModule } from './admin-accounts/admin-accounts.module.js';
import { AdminTransactionsModule } from './admin-transactions/admin-transactions.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    // Core infrastructure
    PrismaModule,
    AuthModule,

    // Identity & access management
    UsersModule,
    AdminsModule,
    RbacModule,

    // Financial modules
    WalletsModule,
    LedgerModule,
    TransactionsModule,
    AdminCustomersModule,
    AdminAccountsModule,
    AdminTransactionsModule,
    // Audit
    AuditModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}