// Prisma 7 client singleton — requires @prisma/adapter-pg (driver adapter pattern).
// In Prisma 7, PrismaClient no longer reads DATABASE_URL automatically;
// a driver adapter must be passed explicitly.
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/client';

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

// Singleton pattern for Next.js (prevents creating multiple clients in dev hot-reload)
const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
