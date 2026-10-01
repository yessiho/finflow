import { Module } from '@nestjs/common';

import { AuditModule } from '../audit/audit.module.js';
import { AdminsController } from './admins.controller.js';
import { AdminsService } from './admins.service.js';

@Module({
  imports: [AuditModule],
  controllers: [AdminsController],
  providers: [AdminsService],
  exports: [AdminsService],
})
export class AdminsModule {}