import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

import { AdminAccountsController } from './admin-accounts.controller.js';
import { AdminAccountsService } from './admin-accounts.service.js';

@Module({
  imports: [
    PrismaModule,
    RbacModule,
  ],

  controllers: [
    AdminAccountsController,
  ],

  providers: [
    AdminAccountsService,
  ],

  exports: [
    AdminAccountsService,
  ],
})
export class AdminAccountsModule {}