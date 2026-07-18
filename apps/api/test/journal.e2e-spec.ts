import './load-test-env';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { prisma } from '@personal-os/database';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/http/all-exceptions.filter';
import { ResponseInterceptor } from '../src/common/http/response.interceptor';

/**
 * Phase 1 (late) Journal integration test against REAL Supabase.
 * Focus: 1 entry/day (409), revive-on-recreate after soft delete, get-by-date.
 */
describe('Journal (e2e)', () => {
  let app: INestApplication;
  const email = `e2e_jr_${Date.now()}@personal-os.test`;
  let userId: string;
  let workspaceId: string;
  let token: string;
  let entryId: string;
  const date = '2026-02-10';

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    const reg = await http()
      .post('/api/v1/auth/register')
      .send({ email, password: 'password123', name: 'Jr User' })
      .expect(201);
    userId = reg.body.data.user.id;
    workspaceId = reg.body.data.user.workspaceId;
    token = reg.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    if (userId) {
      await prisma.journal.deleteMany({ where: { userId } });
      const visions = await prisma.vision.findMany({ where: { userId }, select: { id: true } });
      const vIds = visions.map((v) => v.id);
      const goals = await prisma.goal.findMany({ where: { visionId: { in: vIds } }, select: { id: true } });
      const gIds = goals.map((g) => g.id);
      const projects = await prisma.project.findMany({ where: { goalId: { in: gIds } }, select: { id: true } });
      await prisma.project.deleteMany({ where: { id: { in: projects.map((p) => p.id) } } });
      await prisma.goal.deleteMany({ where: { id: { in: gIds } } });
      await prisma.vision.deleteMany({ where: { id: { in: vIds } } });
      await prisma.activityLog.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    if (workspaceId) await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    await app.close();
    await prisma.$disconnect();
  });

  it('creates a journal entry for a date', async () => {
    const res = await http()
      .post('/api/v1/journals')
      .set(auth())
      .send({ date, content: 'First entry', mood: 'good' })
      .expect(201);
    expect(res.body.data.date).toBe(date);
    expect(res.body.data.mood).toBe('good');
    entryId = res.body.data.id;
  });

  it('fetches the entry by date', async () => {
    const res = await http().get(`/api/v1/journals/date/${date}`).set(auth()).expect(200);
    expect(res.body.data.id).toBe(entryId);
  });

  it('rejects a second active entry for the same day (409)', async () => {
    await http()
      .post('/api/v1/journals')
      .set(auth())
      .send({ date, content: 'Duplicate' })
      .expect(409);
  });

  it('REVIVES the entry when recreating after a soft delete', async () => {
    await http().delete(`/api/v1/journals/${entryId}`).set(auth()).expect(200);
    // date is now free (soft-deleted); recreate must revive, not 409, and reuse the id
    const res = await http()
      .post('/api/v1/journals')
      .set(auth())
      .send({ date, content: 'Revived text', mood: 'great' })
      .expect(201);
    expect(res.body.data.id).toBe(entryId); // same row revived
    expect(res.body.data.content).toBe('Revived text');
    expect(res.body.data.mood).toBe('great');

    // exactly one active row for that date
    const count = await prisma.journal.count({ where: { userId, date: new Date(`${date}T00:00:00.000Z`), deletedAt: null } });
    expect(count).toBe(1);
  });

  it('lists journals with pagination', async () => {
    const res = await http().get('/api/v1/journals?page=1&pageSize=10').set(auth()).expect(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
  });
});
