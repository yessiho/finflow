import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { RbacModule } from '../rbac/rbac.module.js';

import { AdminCustomersController } from './admin-customers.controller.js';
import { AdminCustomersService } from './admin-customers.service.js';

@Module({
  imports: [PrismaModule, RbacModule],
  controllers: [AdminCustomersController],
  providers: [AdminCustomersService],
  exports: [AdminCustomersService],
})
export class AdminCustomersModule {}
