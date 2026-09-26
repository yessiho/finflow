import 'dotenv/config';

import { PrismaService } from '../src/prisma/prisma.service.js';
import { RbacSeedService } from '../src/rbac/rbac.seed.js';

async function bootstrap() {
  const prisma = new PrismaService();

  const seedService = new RbacSeedService(
    prisma,
  );

  try {
    await seedService.seed();

    console.log(
      'RBAC seed completed successfully.',
    );
  } catch (error) {
    console.error(
      'RBAC seed failed:',
      error,
    );

    process.exitCode = 1;
  } finally {
    await prisma.onModuleDestroy();
  }
}

await bootstrap();
