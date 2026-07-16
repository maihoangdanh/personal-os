/**
 * Side-effect module: loads environment variables BEFORE any other import runs.
 *
 * Must be the very first import in main.ts. The shared Prisma singleton
 * (`@personal-os/database`) instantiates `new PrismaClient()` at import time and
 * reads `process.env.DATABASE_URL` then — so the env must already be populated.
 *
 * Loads apps/api/.env first, then falls back to packages/database/.env for
 * DATABASE_URL (inherited, not duplicated as the source of truth).
 */
import { config } from 'dotenv';
import { resolve } from 'path';

// apps/api/.env (this app's own config, incl. a copy of DATABASE_URL + JWT secrets)
config({ path: resolve(__dirname, '..', '.env') });

// packages/database/.env — inherited DATABASE_URL, does not override values already set
config({ path: resolve(__dirname, '..', '..', '..', 'packages', 'database', '.env') });
