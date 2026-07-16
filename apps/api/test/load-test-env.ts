/**
 * Loads env for e2e tests before @personal-os/database instantiates PrismaClient.
 * Reads the same apps/api/.env (DATABASE_URL + JWT secrets) and the shared
 * packages/database/.env fallback.
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '..', '.env') });
config({ path: resolve(__dirname, '..', '..', '..', 'packages', 'database', '.env') });
