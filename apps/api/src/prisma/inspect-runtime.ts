import { PrismaService } from './prisma.service.js';

async function inspect() {
  const prisma = new PrismaService();

  const ledgerAccount = prisma.client.orm.public.LedgerAccount;

  const ledgerEntry = prisma.client.orm.public.LedgerEntry;

  console.log(
    'LedgerAccount methods:',
    Object.getOwnPropertyNames(Object.getPrototypeOf(ledgerAccount)),
  );

  console.log(
    'LedgerEntry methods:',
    Object.getOwnPropertyNames(Object.getPrototypeOf(ledgerEntry)),
  );

  console.log('LedgerAccount object:', ledgerAccount);

  console.log('LedgerEntry object:', ledgerEntry);
}

inspect();
