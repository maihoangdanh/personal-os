// Unit-test env bootstrap. A dummy DATABASE_URL keeps `new PrismaClient()` (loaded
// transitively via NestJS DI metadata) from throwing; no query ever runs because
// repositories are mocked in unit tests.
process.env.DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db';
process.env.NODE_ENV = 'test';
