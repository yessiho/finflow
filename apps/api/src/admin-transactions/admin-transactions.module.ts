import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

import { AdminTransactionsController } from './admin-transactions.controller.js';
import { AdminTransactionsService } from './admin-transactions.service.js';

@Module({
  imports: [
    PrismaModule,
    RbacModule,
  ],
  controllers: [
    AdminTransactionsController,
  ],
  providers: [
    AdminTransactionsService,
  ],
  exports: [
    AdminTransactionsService,
  ],
})
export class AdminTransactionsModule {}