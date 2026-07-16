import { PrismaClient } from '@prisma/client';

/**
 * Shared PrismaClient singleton for the whole monorepo (apps/api, apps/worker).
 *
 * A single instance is reused across hot-reloads in dev so we don't exhaust the
 * Postgres connection pool by spawning a new client on every reload.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Re-export the generated types/enums so consumers import everything from
// @personal-os/database instead of reaching into @prisma/client directly.
export * from '@prisma/client';
