import './load-test-env';

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { prisma } from '@personal-os/database';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/http/all-exceptions.filter';
import { ResponseInterceptor } from '../src/common/http/response.interceptor';

/**
 * Phase 3 Finance integration test against the REAL Supabase DB. Focus: MONEY
 * CORRECTNESS — wallet balances after many transactions, transfers NOT
 * double-counted in reports/budgets, net worth, and atomic transfer delete.
 */
describe('Finance (e2e)', () => {
  let app: INestApplication;
  const email = `e2e_fin_${Date.now()}@personal-os.test`;
  let userId: string;
  let workspaceId: string;
  let token: string;
  let walletA: string;
  let walletB: string;
  let transferLegId: string;

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
      .send({ email, password: 'password123', name: 'Fin User' })
      .expect(201);
    userId = reg.body.data.user.id;
    workspaceId = reg.body.data.user.workspaceId;
    token = reg.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    if (userId) {
      const wallets = await prisma.wallet.findMany({ where: { userId }, select: { id: true } });
      const wIds = wallets.map((w) => w.id);
      await prisma.transaction.deleteMany({ where: { walletId: { in: wIds } } });
      await prisma.wallet.deleteMany({ where: { id: { in: wIds } } });
      await prisma.budget.deleteMany({ where: { userId } });
      await prisma.investment.deleteMany({ where: { userId } });
      await prisma.asset.deleteMany({ where: { userId } });
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

  it('creates two wallets (balance starts at 0)', async () => {
    const a = await http().post('/api/v1/wallets').set(auth()).send({ name: 'Bank', type: 'BANK' }).expect(201);
    const b = await http().post('/api/v1/wallets').set(auth()).send({ name: 'Cash', type: 'CASH' }).expect(201);
    expect(a.body.data.balance).toBe(0);
    walletA = a.body.data.id;
    walletB = b.body.data.id;
  });

  it('rejects amount <= 0 (422)', async () => {
    await http()
      .post('/api/v1/transactions')
      .set(auth())
      .send({ walletId: walletA, type: 'INCOME', amount: 0 })
      .expect(422);
  });

  it('maintains wallet balance across income + expense', async () => {
    await http().post('/api/v1/transactions').set(auth())
      .send({ walletId: walletA, type: 'INCOME', amount: 1000, category: 'Salary' }).expect(201);
    await http().post('/api/v1/transactions').set(auth())
      .send({ walletId: walletA, type: 'EXPENSE', amount: 300, category: 'Food' }).expect(201);

    const a = await http().get(`/api/v1/wallets/${walletA}`).set(auth()).expect(200);
    expect(a.body.data.balance).toBe(700); // 1000 - 300
  });

  it('transfer moves money between wallets and updates both balances', async () => {
    const res = await http()
      .post('/api/v1/transactions/transfer')
      .set(auth())
      .send({ fromWalletId: walletA, toWalletId: walletB, amount: 200, description: 'move' })
      .expect(201);
    expect(res.body.data.from.type).toBe('EXPENSE');
    expect(res.body.data.to.type).toBe('INCOME');
    expect(res.body.data.transferGroupId).toBeTruthy();
    transferLegId = res.body.data.from.id;

    const a = await http().get(`/api/v1/wallets/${walletA}`).set(auth()).expect(200);
    const b = await http().get(`/api/v1/wallets/${walletB}`).set(auth()).expect(200);
    expect(a.body.data.balance).toBe(500); // 700 - 200
    expect(b.body.data.balance).toBe(200); // 0 + 200
  });

  it('report EXCLUDES transfers (no double-count)', async () => {
    const res = await http().get('/api/v1/finance/report').set(auth()).expect(200);
    // income = 1000 (Salary only, NOT the +200 transfer income leg)
    // expense = 300 (Food only, NOT the +200 transfer expense leg)
    expect(res.body.data.income).toBe(1000);
    expect(res.body.data.expense).toBe(300);
    expect(res.body.data.profit).toBe(700);
    expect(res.body.data.savingRate).toBe(0.7);
  });

  it('budget-vs-actual excludes transfers', async () => {
    const cat = await http().post('/api/v1/budgets').set(auth())
      .send({ name: 'Food cap', category: 'Food', amount: 500 }).expect(201);
    const catStatus = await http().get(`/api/v1/budgets/${cat.body.data.id}/status`).set(auth()).expect(200);
    expect(catStatus.body.data.actual).toBe(300); // Food expense only
    expect(catStatus.body.data.remaining).toBe(200);
    expect(catStatus.body.data.exceeded).toBe(false);

    const total = await http().post('/api/v1/budgets').set(auth())
      .send({ name: 'Total cap', amount: 1000 }).expect(201);
    const totalStatus = await http().get(`/api/v1/budgets/${total.body.data.id}/status`).set(auth()).expect(200);
    expect(totalStatus.body.data.actual).toBe(300); // total expense excl. transfer (NOT 500)
  });

  it('net worth = Σ wallet.balance + Σ investment.currentValue + Σ asset.value', async () => {
    await http().post('/api/v1/investments').set(auth())
      .send({ name: 'BTC', type: 'crypto', amount: 1000, currentValue: 1500 }).expect(201);
    await http().post('/api/v1/assets').set(auth())
      .send({ name: 'Car', type: 'Vehicle', value: 3000 }).expect(201);

    const res = await http().get('/api/v1/finance/net-worth').set(auth()).expect(200);
    // wallets 500 + 200 = 700; investment 1500; asset 3000 => 5200
    expect(res.body.data.walletTotal).toBe(700);
    expect(res.body.data.investmentTotal).toBe(1500);
    expect(res.body.data.assetTotal).toBe(3000);
    expect(res.body.data.netWorth).toBe(5200);
  });

  it('deleting one transfer leg removes both and restores balances', async () => {
    await http().delete(`/api/v1/transactions/${transferLegId}`).set(auth()).expect(200);
    const a = await http().get(`/api/v1/wallets/${walletA}`).set(auth()).expect(200);
    const b = await http().get(`/api/v1/wallets/${walletB}`).set(auth()).expect(200);
    expect(a.body.data.balance).toBe(700); // transfer reverted
    expect(b.body.data.balance).toBe(0);
  });
});
