import { PrismaService } from './src/prisma/prisma.service.js';

async function main() {
  const prismaService = new PrismaService();

  const transaction =
    await prismaService.client.orm.public.Transaction.first({
      id: 3,
    });

  console.log('\nTRANSACTION ID 3:');
  console.log(transaction);

  const wallets =
    await prismaService.client.orm.public.Wallet.all();

  console.log('\nALL WALLETS:');
  console.log(wallets);

  if (transaction) {
    console.log('\nSOURCE WALLET ID:', transaction.sourceWalletId);
    console.log(
      'DESTINATION WALLET ID:',
      transaction.destinationWalletId,
    );
  }

  await prismaService.onModuleDestroy();
}

main().catch(console.error);