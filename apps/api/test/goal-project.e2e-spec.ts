import './load-test-env'; // populate env before @personal-os/database loads

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { prisma } from '@personal-os/database';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/http/all-exceptions.filter';
import { ResponseInterceptor } from '../src/common/http/response.interceptor';
import { seedUser } from './seed-user';

/**
 * Phase 2 integration test against the REAL Supabase DB:
 * register -> vision -> goal (+progress) -> project -> milestone -> task
 * -> rollup (project progress + milestone completion) -> close-project rule.
 */
describe('Goal + Project (e2e)', () => {
  let app: INestApplication;
  const email = `e2e_gp_${Date.now()}@personal-os.test`;
  let userId: string;
  let workspaceId: string;
  let token: string;
  let visionId: string;
  let goalId: string;
  let projectId: string;
  let milestoneId: string;
  let taskId: string;

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    app.useGlobalInterceptors(new ResponseInterceptor());
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();

    // Registration is closed (single-account system); seed a user directly.
    const seeded = await seedUser(email);
    userId = seeded.user.id;
    workspaceId = seeded.workspace.id;
    const login = await http()
      .post('/api/v1/auth/login')
      .send({ email, password: seeded.password })
      .expect(200);
    token = login.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    if (userId) {
      const visions = await prisma.vision.findMany({ where: { userId }, select: { id: true } });
      const vIds = visions.map((v) => v.id);
      const goals = await prisma.goal.findMany({ where: { visionId: { in: vIds } }, select: { id: true } });
      const gIds = goals.map((g) => g.id);
      const projects = await prisma.project.findMany({ where: { goalId: { in: gIds } }, select: { id: true } });
      const pIds = projects.map((p) => p.id);
      await prisma.timeLog.deleteMany({ where: { task: { projectId: { in: pIds } } } });
      await prisma.task.deleteMany({ where: { projectId: { in: pIds } } });
      await prisma.milestone.deleteMany({ where: { projectId: { in: pIds } } });
      await prisma.project.deleteMany({ where: { id: { in: pIds } } });
      await prisma.kPI.deleteMany({ where: { goalId: { in: gIds } } });
      await prisma.goal.deleteMany({ where: { id: { in: gIds } } });
      await prisma.vision.deleteMany({ where: { id: { in: vIds } } });
      await prisma.activityLog.deleteMany({ where: { userId } });
      await prisma.user.deleteMany({ where: { id: userId } });
    }
    if (workspaceId) await prisma.workspace.deleteMany({ where: { id: workspaceId } });
    await app.close();
    await prisma.$disconnect();
  });

  it('creates a vision', async () => {
    const res = await http()
      .post('/api/v1/visions')
      .set(auth())
      .send({ title: 'Financial freedom', targetYear: 2030 })
      .expect(201);
    expect(res.body.data.title).toBe('Financial freedom');
    visionId = res.body.data.id;
  });

  it('creates a goal and computes progress', async () => {
    const res = await http()
      .post('/api/v1/goals')
      .set(auth())
      .send({ visionId, title: 'Save 1000', targetValue: 1000, currentValue: 250 })
      .expect(201);
    expect(res.body.data.progress).toBe(25);
    goalId = res.body.data.id;

    const prog = await http().get(`/api/v1/goals/${goalId}/progress`).set(auth()).expect(200);
    expect(prog.body.data.progress).toBe(25);
  });

  it('creates a project (progress starts at 0)', async () => {
    const res = await http()
      .post('/api/v1/projects')
      .set(auth())
      .send({ goalId, title: 'Q1 plan' })
      .expect(201);
    expect(res.body.data.progress).toBe(0);
    projectId = res.body.data.id;
  });

  it('creates a milestone', async () => {
    const res = await http()
      .post('/api/v1/milestones')
      .set(auth())
      .send({ projectId, title: 'Phase A' })
      .expect(201);
    expect(res.body.data.isCompleted).toBe(false);
    milestoneId = res.body.data.id;
  });

  it('creates a task in the project + milestone (project progress stays 0)', async () => {
    const res = await http()
      .post('/api/v1/tasks')
      .set(auth())
      .send({ title: 'Do work', impact: 3, urgency: 3, projectId, milestoneId })
      .expect(201);
    expect(res.body.data.projectId).toBe(projectId);
    expect(res.body.data.milestoneId).toBe(milestoneId);
    taskId = res.body.data.id;

    const prog = await http().get(`/api/v1/projects/${projectId}/progress`).set(auth()).expect(200);
    expect(prog.body.data).toEqual({ projectId, progress: 0, doneTasks: 0, totalTasks: 1 });
  });

  it('rejects a milestone from a different project (422)', async () => {
    // milestone belongs to `projectId`; create a task in the Inbox project referencing it
    await http()
      .post('/api/v1/tasks')
      .set(auth())
      .send({ title: 'X', impact: 1, urgency: 1, milestoneId })
      .expect(422);
  });

  it('completing the task rolls up project progress to 100 and completes the milestone', async () => {
    await http().post(`/api/v1/tasks/${taskId}/complete`).set(auth()).expect(200);

    const project = await http().get(`/api/v1/projects/${projectId}`).set(auth()).expect(200);
    expect(project.body.data.progress).toBe(100);

    const milestone = await http().get(`/api/v1/milestones/${milestoneId}`).set(auth()).expect(200);
    expect(milestone.body.data.isCompleted).toBe(true);
  });

  it('blocks completing the project while a task is DOING (422)', async () => {
    // add a second task and move it to DOING
    const t2 = await http()
      .post('/api/v1/tasks')
      .set(auth())
      .send({ title: 'Ongoing', impact: 2, urgency: 2, projectId, status: 'DOING' })
      .expect(201);
    expect(t2.body.data.status).toBe('DOING');

    // project progress now 1 done / 2 total = 50
    const project = await http().get(`/api/v1/projects/${projectId}`).set(auth()).expect(200);
    expect(project.body.data.progress).toBe(50);

    await http()
      .patch(`/api/v1/projects/${projectId}`)
      .set(auth())
      .send({ status: 'COMPLETED' })
      .expect(422);
  });
});
