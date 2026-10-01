import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';
import { AuditModule } from '../audit/audit.module.js';

import { RbacGuard } from './rbac.guard.js';
import { RbacService } from './rbac.service.js';
import { RbacSeedService } from './rbac.seed.js';
import { AdminRoleAssignmentService } from './admin-role-assignment.service.js';
import { AdminRoleAssignmentController } from './admin-role-assignment.controller.js';

@Global()
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AuditModule,
  ],

  controllers: [
    AdminRoleAssignmentController,
  ],

  providers: [
    RbacService,
    RbacGuard,
    RbacSeedService,
    AdminRoleAssignmentService,
  ],

  exports: [
    RbacService,
    RbacGuard,
    RbacSeedService,
    AdminRoleAssignmentService,
  ],
})
export class RbacModule {}