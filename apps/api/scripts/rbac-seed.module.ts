import { Module } from '@nestjs/common';
import { PrismaModule } from '../src/prisma/prisma.module.js';
import { RbacSeedService } from '../src/rbac/rbac.seed.js';

@Module({
  imports: [PrismaModule],
  providers: [RbacSeedService],
  exports: [RbacSeedService],
})
export class RbacSeedModule {}