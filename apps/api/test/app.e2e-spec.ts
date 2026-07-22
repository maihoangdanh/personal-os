import './load-test-env'; // populate env before @personal-os/database loads

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { prisma } from '@personal-os/database';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/http/all-exceptions.filter';
import { ResponseInterceptor } from '../src/common/http/response.interceptor';
import { seedUser } from './seed-user';

/** Pull the refreshToken=... cookie string out of a Set-Cookie header. */
function refreshCookie(res: request.Response): string {
  const raw = res.headers['set-cookie'] as unknown as string[] | undefined;
  const cookie = (raw ?? []).find((c) => c.startsWith('refreshToken='));
  if (!cookie) throw new Error('no refreshToken cookie in response');
  return cookie.split(';')[0]; // "refreshToken=<jwt>"
}

/**
 * Full-slice integration test against the REAL Supabase DB:
 *   register -> login -> create task -> list tasks.
 * Cleans up all rows it creates afterwards (hard delete, dependency order).
 */
describe('Auth + Task (e2e)', () => {
  let app: INestApplication;
  const email = `e2e_${Date.now()}@personal-os.test`;
  const password = 'password123';
  let workspaceId: string;
  let userId: string;
  let accessToken: string;
  let createdTaskId: string;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    // Registration is closed (single-account system); seed a user directly.
    const seeded = await seedUser(email, password);
    userId = seeded.user.id;
    workspaceId = seeded.workspace.id;
  });

  afterAll(async () => {
    // Hard-delete created rows in FK dependency order.
    if (userId) {
      const visions = await prisma.vision.findMany({
        where: { userId },
        select: { id: true },
      });
      const visionIds = visions.map((v) => v.id);
      const goals = await prisma.goal.findMany({
        where: { visionId: { in: visionIds } },
        select: { id: true },
      });
      const goalIds = goals.map((g) => g.id);
      const projects = await prisma.project.findMany({
        where: { goalId: { in: goalIds } },
        select: { id: true },
      });
      const projectIds = projects.map((p) => p.id);

      await prisma.timeLog.deleteMany({
        where: { task: { projectId: { in: projectIds } } },
      });
      await prisma.task.deleteMany({
        where: { projectId: { in: projectIds } },
      });
      await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
      await prisma.goal.deleteMany({ where: { id: { in: goalIds } } });
      await prisma.vision.deleteMany({ where: { id: { in: visionIds } } });
      await prisma.activityLog.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    if (workspaceId) {
      await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    }
    await app.close();
    await prisma.$disconnect();
  });

  it('registration is CLOSED — returns 403 and creates no user (single-account)', async () => {
    const before = await prisma.user.count({ where: { deletedAt: null } });
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: `intruder_${Date.now()}@example.com`, password, name: 'Nope' })
      .expect(403);
    const after = await prisma.user.count({ where: { deletedAt: null } });
    expect(after).toBe(before); // no new user created
  });

  it('logs in and returns tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    expect(res.body.data.tokens.accessToken).toBeDefined();
    accessToken = res.body.data.tokens.accessToken;
  });

  it('rejects /tasks without a token (401)', async () => {
    await request(app.getHttpServer()).get('/api/v1/tasks').expect(401);
  });

  // Cookie-flow tests share ONE login (auth/login is rate-limited to 5/min/IP,
  // and the suite already spends several logins elsewhere).
  let flowCookie: string; // latest VALID refresh cookie
  let flowAccess: string; // access token from the latest refresh

  it('login sets an httpOnly refreshToken cookie and omits it from the body', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(200);

    // body has accessToken but NOT refreshToken (it lives in the cookie now)
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeUndefined();

    const setCookie = (res.headers['set-cookie'] as unknown as string[]) ?? [];
    const rt = setCookie.find((c) => c.startsWith('refreshToken='))!;
    expect(rt).toBeDefined();
    expect(rt.toLowerCase()).toContain('httponly');
    expect(rt).toContain('Path=/api/v1/auth');
    expect(rt.toLowerCase()).toContain('samesite=lax');

    flowCookie = refreshCookie(res);
    flowAccess = res.body.data.tokens.accessToken;
  });

  it('refresh reads the cookie, rotates the token, and rejects the old one', async () => {
    // refresh WITHOUT a body — token comes only from the cookie
    const refreshed = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', flowCookie)
      .expect(200);
    expect(refreshed.body.data.tokens.accessToken).toBeDefined();
    expect(refreshed.body.data.tokens.refreshToken).toBeUndefined();
    const rotated = refreshCookie(refreshed);
    expect(rotated).not.toBe(flowCookie); // rotated

    // the OLD (rotated-out) cookie is now rejected — replay defence
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', flowCookie)
      .expect(401);

    flowCookie = rotated; // only the rotated cookie is valid now
    flowAccess = refreshed.body.data.tokens.accessToken;
  });

  it('refresh without any cookie -> 401', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .expect(401);
  });

  it('logout revokes the current token and clears the cookie', async () => {
    const out = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${flowAccess}`)
      .set('Cookie', flowCookie)
      .expect(200);
    expect(out.body.data.loggedOut).toBe(true);
    const cleared = (out.headers['set-cookie'] as unknown as string[]) ?? [];
    expect(cleared.some((c) => c.startsWith('refreshToken='))).toBe(true);

    // the revoked token can no longer be refreshed
    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .set('Cookie', flowCookie)
      .expect(401);
  });

  it('PATCH /auth/me updates name/timezone (not email/role)', async () => {
    const res = await request(app.getHttpServer())
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ name: 'Renamed', timezone: 'UTC' })
      .expect(200);
    expect(res.body.data.name).toBe('Renamed');
    expect(res.body.data.timezone).toBe('UTC');
    expect(res.body.data.email).toBe(email); // unchanged
    expect(res.body.data.role).toBe('OWNER'); // unchanged
  });

  it('change-password: wrong current -> 422, correct -> new password works', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: 'wrong-one', newPassword: 'brandnew123' })
      .expect(422);

    const changed = await request(app.getHttpServer())
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword: 'brandnew123' })
      .expect(200);
    expect(changed.body.data.changed).toBe(true);

    // old password no longer works, new one does
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(401);
    const relogin = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password: 'brandnew123' })
      .expect(200);
    accessToken = relogin.body.data.tokens.accessToken; // keep token valid for later tests
  });

  it('creates a task in the default Inbox project', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/tasks')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ title: 'First task', impact: 4, urgency: 5 })
      .expect(201);

    expect(res.body.data.title).toBe('First task');
    expect(res.body.data.priorityScore).toBe(20); // 4 × 5
    expect(res.body.data.projectId).toBeDefined();
    createdTaskId = res.body.data.id;
  });

  it('lists tasks with pagination meta', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/tasks?page=1&pageSize=10')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
    expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    expect(res.body.data.some((t: any) => t.id === createdTaskId)).toBe(true);
  });

  it('reflects a running timer via isTimerRunning + activeTimeLogId', async () => {
    const started = await request(app.getHttpServer())
      .post(`/api/v1/tasks/${createdTaskId}/timer/start`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    const activeId = started.body.data.id;

    const running = await request(app.getHttpServer())
      .get(`/api/v1/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(running.body.data.isTimerRunning).toBe(true);
    expect(running.body.data.activeTimeLogId).toBe(activeId);

    await request(app.getHttpServer())
      .post(`/api/v1/tasks/${createdTaskId}/timer/stop`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const stopped = await request(app.getHttpServer())
      .get(`/api/v1/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(stopped.body.data.isTimerRunning).toBe(false);
    expect(stopped.body.data.activeTimeLogId).toBeNull();
  });

  it('moves the task through DOING and REVIEW (case-insensitive wire)', async () => {
    // lowercase "doing" must be accepted and echoed back as canonical UPPER
    const toDoing = await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'doing' })
      .expect(200);
    expect(toDoing.body.data.status).toBe('DOING');

    const toReview = await request(app.getHttpServer())
      .patch(`/api/v1/tasks/${createdTaskId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ status: 'REVIEW' })
      .expect(200);
    expect(toReview.body.data.status).toBe('REVIEW');
    expect(toReview.body.data.completedAt).toBeNull();
  });

  it('filters by status=doing (lowercase query)', async () => {
    // task is currently REVIEW, so DOING filter should exclude it
    const res = await request(app.getHttpServer())
      .get('/api/v1/tasks?status=doing')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(res.body.data.every((t: any) => t.status === 'DOING')).toBe(true);
  });

  it('completes the task', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/tasks/${createdTaskId}/complete`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(res.body.data.status).toBe('DONE');
    expect(res.body.data.completedAt).not.toBeNull();
  });
});
