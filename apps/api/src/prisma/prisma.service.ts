import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { db } from './db.js';

@Injectable()
export class PrismaService implements OnModuleDestroy {
  get client() {
    return db;
  }

  async onModuleDestroy() {
    // Prisma 8's postgres runtime manages the underlying connection.
  }
}
