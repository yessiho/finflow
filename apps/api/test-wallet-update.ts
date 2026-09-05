import { db } from './src/prisma/db.js';

async function test() {
  const wallet = db.orm.public.Wallet;

  await wallet
    .where({
      id: 1,
    })
    .update({
      balance: BigInt(1000),
    });
}

test();
