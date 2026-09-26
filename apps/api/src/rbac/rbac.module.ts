import { Global, Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

import { RbacGuard } from './rbac.guard.js';
import { RbacService } from './rbac.service.js';
import { RbacSeedService } from './rbac.seed.js';

@Global()
@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],
  providers: [
    RbacService,
    RbacGuard,
    RbacSeedService,
  ],
  exports: [
    RbacService,
    RbacGuard,
    RbacSeedService,
  ],
})
export class RbacModule {}
