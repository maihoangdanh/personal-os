import './load-test-env'; // populate env before @personal-os/database loads

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { prisma } from '@personal-os/database';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/http/all-exceptions.filter';
import { ResponseInterceptor } from '../src/common/http/response.interceptor';

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

  it('registers a new user + workspace', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, name: 'E2E User' })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(email);
    expect(res.body.data.user.role).toBe('OWNER');
    expect(res.body.data.tokens.accessToken).toBeDefined();
    userId = res.body.data.user.id;
    workspaceId = res.body.data.user.workspaceId;
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
