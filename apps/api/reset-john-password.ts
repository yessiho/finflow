import * as bcrypt from 'bcrypt';
import { db } from './src/prisma/db.js';

async function resetPassword() {
  const newPassword = 'Password123';

  const passwordHash = await bcrypt.hash(newPassword, 12);

  const user = await db.orm.public.User.where({
    id: 2,
  }).update({
    passwordHash,
  });

  console.log('Password reset successful');
  console.log({
    id: user?.id,
    email: user?.email,
  });
}

resetPassword()
  .catch((error) => {
    console.error('Password reset failed:', error);
  })
  .finally(async () => {
    await db.close();
  });
