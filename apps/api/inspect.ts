import { db } from './src/prisma/db.js';

const wallet = db.orm.public.Wallet;

console.log('UPDATE FUNCTION:');
console.log(wallet.update.toString());

console.log('\nWHERE FUNCTION:');
console.log(wallet.where.toString());
