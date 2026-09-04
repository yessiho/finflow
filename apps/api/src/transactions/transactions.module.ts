import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { TransactionsController } from './transactions.controller.js';
import { TransactionsService } from './transactions.service.js';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TransactionsController],
  providers: [TransactionsService],
})
export class TransactionsModule {}