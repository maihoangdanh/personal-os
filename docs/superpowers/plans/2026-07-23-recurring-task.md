# Task lặp lại (Recurring Task) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép tạo Task lặp lại (hàng ngày / hàng tuần theo thứ) gắn với 1 Project cụ thể — mỗi kỳ tự sinh 1 Task instance độc lập (giữ impact/urgency/timer/lịch sử riêng), tự động archive instance bị bỏ lỡ, và có nút dừng lặp ngay trên Task.

**Architecture:** Model mới `RecurringTaskTemplate` (packages/database) tách biệt khỏi `Task`, chỉ lưu "khuôn" của chuỗi lặp. Module backend mới `recurring-task` (NestJS, theo đúng pattern `task`/`notification` module hiện có) với 1 scheduler cron (theo pattern `NotificationScheduler`) chạy 1 lần/ngày để archive instance quá hạn + sinh instance mới, tái dùng `TaskRepository.create()`/`update()` có sẵn để không viết lại logic rollup Project.progress. Frontend mở rộng `TaskFormDialog` có sẵn, không tạo màn hình mới.

**Tech Stack:** NestJS + Prisma + PostgreSQL (backend), Next.js 15 + React Query (frontend) — đúng stack hiện có của dự án, không thêm thư viện mới.

Spec đầy đủ: `docs/superpowers/specs/2026-07-23-recurring-task-design.md`

---

## Task 1: Database — model `RecurringTaskTemplate` + cột `Task.recurringTemplateId`

**Files:**
- Modify: `packages/database/prisma/schema.prisma`
- Create: migration qua `prisma migrate dev` (thư mục tự sinh dưới `packages/database/prisma/migrations/`)

- [ ] **Step 1: Thêm enum + model vào schema.prisma**

Mở `packages/database/prisma/schema.prisma`, tìm khối `model NetWorthSnapshot` hoặc `model WeeklyTaskStat` (model cuối file) — thêm NGAY SAU model cuối cùng:

```prisma
enum RecurrenceFrequency {
  DAILY
  WEEKLY
}

// ============================================================
// Module 019_recurring_task (Task lặp lại: hàng ngày / hàng tuần)
// ------------------------------------------------------------
// "Khuôn" của chuỗi lặp — tách biệt hoàn toàn khỏi Task. Mỗi kỳ, backend sinh
// 1 Task instance ĐỘC LẬP (giữ impact/urgency/timer/completedAt riêng từng
// ngày) thay vì tái sử dụng 1 Task duy nhất — xem spec
// docs/superpowers/specs/2026-07-23-recurring-task-design.md.
// ============================================================

model RecurringTaskTemplate {
  id                String              @id @default(uuid()) @db.Uuid
  projectId         String              @db.Uuid
  title             String              @db.VarChar(255)
  description       String?             @db.Text
  impact            Int                 @db.SmallInt
  urgency           Int                 @db.SmallInt
  estimateMinute    Int?
  frequency         RecurrenceFrequency
  weekDays          Int[]               // ISO weekday 1=T2..7=CN; rỗng khi frequency=DAILY
  timeOfDay         String?             @db.VarChar(5) // "HH:mm"; null = không giờ cụ thể
  active            Boolean             @default(true)
  lastGeneratedDate DateTime?           @db.Date
  createdAt         DateTime            @default(now()) @db.Timestamptz(6)
  updatedAt         DateTime            @updatedAt @db.Timestamptz(6)
  deletedAt         DateTime?           @db.Timestamptz(6)

  project Project @relation(fields: [projectId], references: [id], onDelete: Restrict, onUpdate: Cascade)
  tasks   Task[]

  @@index([active])
  @@map("recurring_task_templates")
}
```

Sau đó tìm `model Task {` — thêm 1 dòng field mới ngay dưới `milestoneId` (giữ đúng vị trí các field liên quan-nhóm khác), và thêm 1 dòng relation ngay dưới relation `project`:

```prisma
  recurringTemplateId String? @db.Uuid // set khi Task này được sinh tự động từ 1 chuỗi lặp
```

```prisma
  recurringTemplate RecurringTaskTemplate? @relation(fields: [recurringTemplateId], references: [id], onDelete: SetNull, onUpdate: Cascade)
```

Tìm `model Project {` — thêm vào cuối khối relation của Project 1 dòng:

```prisma
  recurringTaskTemplates RecurringTaskTemplate[]
```

- [ ] **Step 2: Format + validate schema**

Run: `cd packages/database && npx prisma format && npx prisma validate`
Expected: `The schema at prisma\schema.prisma is valid 🚀`

- [ ] **Step 3: Migrate lên Supabase thật**

**Quan trọng**: `DATABASE_URL` trong `.env` trỏ transaction pooler (`:6543?pgbouncer=true`) khiến
`prisma migrate dev` treo vô hạn (đã gặp 3 lần trước — xem `_workspace/24_database_refresh-token.md`).
Phải override tạm qua session connection port 5432 trên dòng lệnh, KHÔNG sửa file `.env`:

Run (PowerShell, từ `packages/database`):
```powershell
$env:DATABASE_URL = ($env:DATABASE_URL -replace ':6543\?pgbouncer=true', ':5432')
npx prisma migrate dev --name 019_recurring_task
```
(Nếu chạy Bash: đọc `.env`, thay `:6543?pgbouncer=true` → `:5432` trong biến môi trường tạm thời
trước khi gọi lệnh, tương tự cách đã làm ở migration 016/017/018.)

Expected: `Applying migration ... Your database is now in sync with your schema.` + Prisma Client
tự generate theo sau.

- [ ] **Step 4: Xác nhận Prisma Client export đúng type**

Run: `grep -n "RecurringTaskTemplate\|RecurrenceFrequency" node_modules/.prisma/client/index.d.ts | head -5`
(chạy trong `packages/database`)
Expected: thấy `export type RecurringTaskTemplate` và `export const RecurrenceFrequency`.

Nếu API dev server đang chạy nền giữ file DLL cũ gây lỗi `EPERM` khi generate — dừng server đó
trước (`Ctrl+C` hoặc kill process `apps/api` npm run dev), chạy lại `npx prisma generate`, KHÔNG
cần khởi động lại server ngay (Task 2 sẽ tự khởi động lại khi cần).

- [ ] **Step 5: Commit**

```bash
git add packages/database/prisma/schema.prisma packages/database/prisma/migrations/
git commit -m "DB: model RecurringTaskTemplate + Task.recurringTemplateId (module 019)"
```

---

## Task 2: Backend — module `recurring-task` (CRUD tối thiểu + scheduler)

**Files:**
- Create: `apps/api/src/recurring-task/dto/create-recurring-task.dto.ts`
- Create: `apps/api/src/recurring-task/dto/recurring-task-response.dto.ts`
- Create: `apps/api/src/recurring-task/recurring-task.repository.ts`
- Create: `apps/api/src/recurring-task/recurring-task.service.ts`
- Create: `apps/api/src/recurring-task/recurring-task.controller.ts`
- Create: `apps/api/src/recurring-task/recurring-task.scheduler.ts`
- Create: `apps/api/src/recurring-task/recurring-task.module.ts`
- Create: `apps/api/src/recurring-task/__tests__/recurring-task.service.spec.ts`
- Modify: `apps/api/src/app.module.ts` — đăng ký `RecurringTaskModule`
- Modify: `apps/api/src/task/dto/task-response.dto.ts` — thêm field `recurringTemplateId`
- Modify: `apps/api/src/task/task.module.ts` — export `TaskRepository` để `RecurringTaskModule` dùng lại

### Step 1: Export `TaskRepository` từ `TaskModule`

`recurring-task.service.ts` cần gọi thẳng `TaskRepository.create()`/`update()` có sẵn (để tái
dùng transaction rollup Project.progress, không viết lại). Sửa
`apps/api/src/task/task.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TaskController } from './task.controller';
import { TaskRepository } from './task.repository';
import { TaskService } from './task.service';

@Module({
  controllers: [TaskController],
  providers: [TaskService, TaskRepository],
  exports: [TaskService, TaskRepository],
})
export class TaskModule {}
```

(Chỉ đổi dòng `exports`, thêm `TaskRepository`.)

- [ ] Áp dụng thay đổi trên.

### Step 2: DTO tạo chuỗi lặp

Create `apps/api/src/recurring-task/dto/create-recurring-task.dto.ts`:

```typescript
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { RecurrenceFrequency } from '@personal-os/database';

/**
 * POST /recurring-tasks
 *
 * weekDays chỉ bắt buộc khi frequency=WEEKLY (kiểm tra ở service, không ở
 * DTO — class-validator không có "required if" đơn giản mà không thêm thư
 * viện, và validate liên-field này gắn liền business rule hơn là input shape).
 */
export class CreateRecurringTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsInt()
  @Min(1)
  @Max(5)
  impact!: number;

  @IsInt()
  @Min(1)
  @Max(5)
  urgency!: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  estimateMinute?: number;

  @IsUUID()
  projectId!: string;

  @IsEnum(RecurrenceFrequency)
  frequency!: RecurrenceFrequency;

  /** ISO weekday 1=T2..7=CN. Bắt buộc + không rỗng khi frequency=WEEKLY (service validate). */
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  weekDays?: number[];

  /** "HH:mm", optional — không set thì deadline sinh ra là 23:59 mỗi ngày. */
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, { message: 'timeOfDay must be HH:mm' })
  timeOfDay?: string;
}
```

- [ ] Tạo file trên.

### Step 3: Response DTO

Create `apps/api/src/recurring-task/dto/recurring-task-response.dto.ts`:

```typescript
import { RecurrenceFrequency, RecurringTaskTemplate } from '@personal-os/database';

export class RecurringTaskTemplateResponseDto {
  id!: string;
  projectId!: string;
  title!: string;
  description!: string | null;
  impact!: number;
  urgency!: number;
  estimateMinute!: number | null;
  frequency!: RecurrenceFrequency;
  weekDays!: number[];
  timeOfDay!: string | null;
  active!: boolean;
  createdAt!: string;
  updatedAt!: string;

  static from(t: RecurringTaskTemplate): RecurringTaskTemplateResponseDto {
    return {
      id: t.id,
      projectId: t.projectId,
      title: t.title,
      description: t.description,
      impact: t.impact,
      urgency: t.urgency,
      estimateMinute: t.estimateMinute,
      frequency: t.frequency,
      weekDays: t.weekDays,
      timeOfDay: t.timeOfDay,
      active: t.active,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    };
  }
}
```

- [ ] Tạo file trên.

### Step 4: Repository

Create `apps/api/src/recurring-task/recurring-task.repository.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { prisma, Prisma, RecurringTaskTemplate } from '@personal-os/database';

/** Scopes any RecurringTaskTemplate query to the owning user via Project -> Goal -> Vision. */
function ownedByUser(userId: string): Prisma.RecurringTaskTemplateWhereInput {
  return { project: { goal: { vision: { userId } } } };
}

@Injectable()
export class RecurringTaskRepository {
  findOwnedProjectId(projectId: string, userId: string): Promise<{ id: string } | null> {
    return prisma.project.findFirst({
      where: { id: projectId, deletedAt: null, goal: { vision: { userId } } },
      select: { id: true },
    });
  }

  create(
    data: Prisma.RecurringTaskTemplateUncheckedCreateInput,
  ): Promise<RecurringTaskTemplate> {
    return prisma.recurringTaskTemplate.create({ data });
  }

  findByIdScoped(id: string, userId: string): Promise<RecurringTaskTemplate | null> {
    return prisma.recurringTaskTemplate.findFirst({
      where: { id, deletedAt: null, ...ownedByUser(userId) },
    });
  }

  update(
    id: string,
    data: Prisma.RecurringTaskTemplateUncheckedUpdateInput,
  ): Promise<RecurringTaskTemplate> {
    return prisma.recurringTaskTemplate.update({ where: { id }, data });
  }

  /** All active templates across all users — used by the daily scheduler (not request-scoped). */
  findAllActive(): Promise<RecurringTaskTemplate[]> {
    return prisma.recurringTaskTemplate.findMany({
      where: { active: true, deletedAt: null },
    });
  }
}
```

- [ ] Tạo file trên.

### Step 5: Service — viết test trước (TDD) cho logic tính lịch/deadline

Đây là phần logic thuần (không cần DB thật) nên viết test trước. Create
`apps/api/src/recurring-task/__tests__/recurring-task.service.spec.ts`:

```typescript
import { UnprocessableEntityException } from '@nestjs/common';
import { RecurrenceFrequency } from '@personal-os/database';
import { RecurringTaskService } from '../recurring-task.service';

const userId = 'user-1';

function makeTemplate(over: Partial<any> = {}) {
  return {
    id: 'tpl-1',
    projectId: 'proj-1',
    title: 'Check TikTok Ads',
    description: null,
    impact: 3,
    urgency: 4,
    estimateMinute: 15,
    frequency: RecurrenceFrequency.DAILY,
    weekDays: [],
    timeOfDay: null,
    active: true,
    lastGeneratedDate: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    deletedAt: null,
    ...over,
  };
}

describe('RecurringTaskService', () => {
  let service: RecurringTaskService;
  let repo: Record<string, jest.Mock>;
  let taskRepo: Record<string, jest.Mock>;
  let audit: { record: jest.Mock };

  beforeEach(() => {
    repo = {
      findOwnedProjectId: jest.fn(),
      create: jest.fn(),
      findByIdScoped: jest.fn(),
      update: jest.fn(),
      findAllActive: jest.fn(),
    };
    taskRepo = {
      create: jest.fn().mockResolvedValue({ id: 'task-1' }),
      update: jest.fn(),
    };
    audit = { record: jest.fn().mockResolvedValue(undefined) };
    service = new RecurringTaskService(repo as any, taskRepo as any, audit as any);
  });

  describe('create', () => {
    it('rejects WEEKLY with empty weekDays (422)', async () => {
      repo.findOwnedProjectId.mockResolvedValue({ id: 'proj-1' });
      await expect(
        service.create(userId, {
          title: 'x',
          impact: 3,
          urgency: 3,
          projectId: 'proj-1',
          frequency: RecurrenceFrequency.WEEKLY,
          weekDays: [],
        } as any),
      ).rejects.toBeInstanceOf(UnprocessableEntityException);
    });

    it('rejects a projectId the user does not own (404)', async () => {
      repo.findOwnedProjectId.mockResolvedValue(null);
      await expect(
        service.create(userId, {
          title: 'x',
          impact: 3,
          urgency: 3,
          projectId: 'not-owned',
          frequency: RecurrenceFrequency.DAILY,
        } as any),
      ).rejects.toThrow('Project not found');
    });
  });

  describe('matchesToday (via maybeGenerateToday)', () => {
    it('DAILY always generates when not yet generated today', async () => {
      const tpl = makeTemplate({ frequency: RecurrenceFrequency.DAILY, lastGeneratedDate: null });
      await service.maybeGenerateToday(tpl as any);
      expect(taskRepo.create).toHaveBeenCalledTimes(1);
      expect(repo.update).toHaveBeenCalledWith(
        'tpl-1',
        expect.objectContaining({ lastGeneratedDate: expect.any(Date) }),
      );
    });

    it('does not generate twice on the same day', async () => {
      const today = new Date();
      const tpl = makeTemplate({ lastGeneratedDate: today });
      await service.maybeGenerateToday(tpl as any);
      expect(taskRepo.create).not.toHaveBeenCalled();
    });

    it('WEEKLY only generates when today matches weekDays', async () => {
      // Pick a weekday NOT today so it should skip.
      const isoToday = ((new Date().getDay() + 6) % 7) + 1; // 1=Mon..7=Sun
      const otherDay = isoToday === 1 ? 2 : 1;
      const tpl = makeTemplate({
        frequency: RecurrenceFrequency.WEEKLY,
        weekDays: [otherDay],
        lastGeneratedDate: null,
      });
      await service.maybeGenerateToday(tpl as any);
      expect(taskRepo.create).not.toHaveBeenCalled();
    });

    it('copies impact/urgency/estimateMinute/projectId and computes priorityScore', async () => {
      const tpl = makeTemplate({ impact: 2, urgency: 5, estimateMinute: 20 });
      await service.maybeGenerateToday(tpl as any);
      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          projectId: 'proj-1',
          title: 'Check TikTok Ads',
          impact: 2,
          urgency: 5,
          priorityScore: 10,
          estimateMinute: 20,
          status: 'TODO',
          recurringTemplateId: 'tpl-1',
        }),
      );
    });
  });

  describe('stop', () => {
    it('sets active=false', async () => {
      repo.findByIdScoped.mockResolvedValue(makeTemplate());
      repo.update.mockResolvedValue(makeTemplate({ active: false }));
      const res = await service.stop(userId, 'tpl-1');
      expect(repo.update).toHaveBeenCalledWith('tpl-1', { active: false });
      expect(res.active).toBe(false);
    });

    it('throws 404 when template not owned/found', async () => {
      repo.findByIdScoped.mockResolvedValue(null);
      await expect(service.stop(userId, 'tpl-x')).rejects.toThrow('Recurring task not found');
    });
  });
});
```

- [ ] **Step 5a: Viết file test trên**

- [ ] **Step 5b: Chạy test, xác nhận FAIL (chưa có service)**

Run: `cd apps/api && npx jest src/recurring-task --no-coverage`
Expected: FAIL — `Cannot find module '../recurring-task.service'`

### Step 6: Viết service để test pass

Create `apps/api/src/recurring-task/recurring-task.service.ts`:

```typescript
import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { RecurrenceFrequency, RecurringTaskTemplate } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { TaskRepository } from '../task/task.repository';
import { CreateRecurringTaskDto } from './dto/create-recurring-task.dto';
import { RecurringTaskTemplateResponseDto } from './dto/recurring-task-response.dto';
import { RecurringTaskRepository } from './recurring-task.repository';

const DEFAULT_DEADLINE_HOUR = 23;
const DEFAULT_DEADLINE_MINUTE = 59;

function dateLabel(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** ISO weekday of `d`: 1=Mon..7=Sun (JS getDay() is 0=Sun..6=Sat). */
function isoWeekday(d: Date): number {
  return ((d.getDay() + 6) % 7) + 1;
}

@Injectable()
export class RecurringTaskService {
  constructor(
    private readonly repo: RecurringTaskRepository,
    private readonly taskRepo: TaskRepository,
    private readonly audit: AuditService,
  ) {}

  async create(
    userId: string,
    dto: CreateRecurringTaskDto,
  ): Promise<RecurringTaskTemplateResponseDto> {
    if (dto.frequency === RecurrenceFrequency.WEEKLY && (!dto.weekDays || dto.weekDays.length === 0)) {
      throw new UnprocessableEntityException('weekDays is required when frequency is WEEKLY');
    }
    const project = await this.repo.findOwnedProjectId(dto.projectId, userId);
    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const template = await this.repo.create({
      projectId: dto.projectId,
      title: dto.title,
      description: dto.description ?? null,
      impact: dto.impact,
      urgency: dto.urgency,
      estimateMinute: dto.estimateMinute ?? null,
      frequency: dto.frequency,
      weekDays: dto.frequency === RecurrenceFrequency.WEEKLY ? dto.weekDays! : [],
      timeOfDay: dto.timeOfDay ?? null,
    });

    // Sinh luôn instance đầu tiên nếu hôm nay khớp lịch — không đợi cron ngày mai.
    const generated = await this.maybeGenerateToday(template);

    await this.audit.record({
      userId,
      action: 'recurring-task.create',
      entityType: 'RecurringTaskTemplate',
      entityId: template.id,
    });

    return RecurringTaskTemplateResponseDto.from(generated ?? template);
  }

  async stop(userId: string, id: string): Promise<RecurringTaskTemplateResponseDto> {
    const template = await this.repo.findByIdScoped(id, userId);
    if (!template) {
      throw new NotFoundException('Recurring task not found');
    }
    const updated = await this.repo.update(id, { active: false });
    await this.audit.record({
      userId,
      action: 'recurring-task.stop',
      entityType: 'RecurringTaskTemplate',
      entityId: id,
    });
    return RecurringTaskTemplateResponseDto.from(updated);
  }

  /**
   * Sinh 1 Task instance cho hôm nay nếu lịch khớp VÀ chưa sinh trong ngày hôm nay.
   * Dùng chung cho create() (sinh ngay) và scheduler (chạy mỗi sáng). Trả về
   * template đã cập nhật lastGeneratedDate nếu có sinh, ngược lại trả nguyên
   * template gốc.
   */
  async maybeGenerateToday(
    template: RecurringTaskTemplate,
  ): Promise<RecurringTaskTemplate | null> {
    const today = new Date();
    if (template.lastGeneratedDate && dateLabel(template.lastGeneratedDate) === dateLabel(today)) {
      return null; // đã sinh hôm nay rồi
    }
    if (!this.matchesToday(template, today)) {
      return null;
    }

    const deadline = this.computeDeadline(template, today);
    await this.taskRepo.create({
      projectId: template.projectId,
      title: template.title,
      description: template.description,
      impact: template.impact,
      urgency: template.urgency,
      priorityScore: template.impact * template.urgency,
      estimateMinute: template.estimateMinute,
      status: 'TODO',
      deadline,
      recurringTemplateId: template.id,
    });

    return this.repo.update(template.id, { lastGeneratedDate: today });
  }

  private matchesToday(template: RecurringTaskTemplate, today: Date): boolean {
    if (template.frequency === RecurrenceFrequency.DAILY) return true;
    return template.weekDays.includes(isoWeekday(today));
  }

  private computeDeadline(template: RecurringTaskTemplate, today: Date): Date {
    if (template.timeOfDay) {
      const [h, m] = template.timeOfDay.split(':').map(Number);
      return new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, m, 0, 0);
    }
    return new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      DEFAULT_DEADLINE_HOUR,
      DEFAULT_DEADLINE_MINUTE,
      0,
      0,
    );
  }
}
```

- [ ] **Step 6a: Viết file service trên**

- [ ] **Step 6b: Chạy lại test, xác nhận PASS**

Run: `cd apps/api && npx jest src/recurring-task --no-coverage`
Expected: `Tests: 8 passed, 8 total` (2 create + 4 maybeGenerateToday + 2 stop)

### Step 7: Scheduler (archive quá hạn + sinh hôm nay cho mọi template active)

Create `apps/api/src/recurring-task/recurring-task.scheduler.ts`:

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { prisma } from '@personal-os/database';
import { TaskRepository } from '../task/task.repository';
import { RecurringTaskRepository } from './recurring-task.repository';
import { RecurringTaskService } from './recurring-task.service';

/**
 * Chạy 1 lần/ngày (đầu giờ sáng, giờ server — hệ thống hiện 1 user thật nên
 * không cần theo timezone riêng từng user, xem spec). Với mỗi template active:
 * 1) archive các Task instance quá hạn (deadline < hôm nay) chưa DONE.
 * 2) sinh instance hôm nay nếu lịch khớp (tái dùng RecurringTaskService).
 */
@Injectable()
export class RecurringTaskScheduler {
  private readonly logger = new Logger(RecurringTaskScheduler.name);

  constructor(
    private readonly repo: RecurringTaskRepository,
    private readonly taskRepo: TaskRepository,
    private readonly service: RecurringTaskService,
  ) {}

  @Cron('10 0 * * *') // 00:10 mỗi ngày — lệch khỏi nửa đêm đúng để tránh trùng job khác
  async run(): Promise<void> {
    const templates = await this.repo.findAllActive();
    let archived = 0;
    let generated = 0;

    for (const template of templates) {
      archived += await this.archiveOverdueInstances(template.id);
      const result = await this.service.maybeGenerateToday(template);
      if (result) generated += 1;
    }

    if (archived > 0 || generated > 0) {
      this.logger.debug(
        `Recurring task run: archived ${archived} overdue instance(s), generated ${generated} new task(s)`,
      );
    }
  }

  private async archiveOverdueInstances(templateId: string): Promise<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const stale = await prisma.task.findMany({
      where: {
        recurringTemplateId: templateId,
        status: { notIn: ['DONE', 'ARCHIVED'] },
        deadline: { lt: startOfToday },
        deletedAt: null,
      },
    });

    for (const task of stale) {
      await this.taskRepo.update(
        task.id,
        { status: 'ARCHIVED' },
        [task.projectId],
        task.milestoneId ? [task.milestoneId] : [],
      );
    }
    return stale.length;
  }
}
```

- [ ] Tạo file trên.

### Step 8: Controller

Create `apps/api/src/recurring-task/recurring-task.controller.ts`:

```typescript
import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { AuthUser } from '../common/auth/auth-user';
import { CurrentUser } from '../common/auth/current-user.decorator';
import { CreateRecurringTaskDto } from './dto/create-recurring-task.dto';
import { RecurringTaskService } from './recurring-task.service';

@Controller('recurring-tasks')
export class RecurringTaskController {
  constructor(private readonly service: RecurringTaskService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateRecurringTaskDto) {
    return this.service.create(user.userId, dto);
  }

  /** Action-style endpoint (khớp convention /tasks/:id/complete đã có) thay vì PATCH chung. */
  @Post(':id/stop')
  @HttpCode(HttpStatus.OK)
  stop(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.stop(user.userId, id);
  }
}
```

- [ ] Tạo file trên.

### Step 9: Module + đăng ký vào app.module.ts

Create `apps/api/src/recurring-task/recurring-task.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { TaskModule } from '../task/task.module';
import { RecurringTaskController } from './recurring-task.controller';
import { RecurringTaskRepository } from './recurring-task.repository';
import { RecurringTaskScheduler } from './recurring-task.scheduler';
import { RecurringTaskService } from './recurring-task.service';

@Module({
  imports: [TaskModule, AuditModule],
  controllers: [RecurringTaskController],
  providers: [RecurringTaskService, RecurringTaskRepository, RecurringTaskScheduler],
})
export class RecurringTaskModule {}
```

- [ ] Tạo file trên.

Modify `apps/api/src/app.module.ts` — thêm import + đăng ký (theo đúng vị trí alphabet như các
module khác):

```typescript
import { RecurringTaskModule } from './recurring-task/recurring-task.module';
```
(chèn sau `import { ProjectModule } from './project/project.module';`, trước
`import { TaskModule } from './task/task.module';`)

Và trong mảng `imports` của `@Module({...})`, thêm `RecurringTaskModule` ngay sau `ProjectModule,`
(trước `TaskModule,`).

- [ ] Áp dụng thay đổi trên.

### Step 10: Thêm `recurringTemplateId` vào TaskResponseDto

Modify `apps/api/src/task/dto/task-response.dto.ts` — thêm field vào class và vào `from()`:

```typescript
  recurringTemplateId!: string | null;
```
(thêm ngay dưới dòng `milestoneId!: string | null;`)

Và trong `static from(task)`, thêm vào object trả về:
```typescript
      recurringTemplateId: task.recurringTemplateId,
```
(thêm ngay dưới dòng `milestoneId: task.milestoneId,`)

- [ ] Áp dụng 2 thay đổi trên (đọc file thật trước khi sửa để khớp đúng vị trí/format hiện có).

### Step 11: Chạy toàn bộ test suite backend

Run: `cd apps/api && npm test`
Expected: tất cả suite pass, tổng số test tăng thêm 8 (từ 127 lên 135), 0 fail.

Run: `cd apps/api && npm run build`
Expected: sạch, không lỗi tsc.

- [ ] Chạy 2 lệnh trên, xác nhận kết quả đúng như Expected.

### Step 12: Commit

```bash
git add apps/api/src/recurring-task apps/api/src/app.module.ts apps/api/src/task/task.module.ts apps/api/src/task/dto/task-response.dto.ts
git commit -m "Backend: module recurring-task (CRUD toi thieu + scheduler cron)"
```

- [ ] Chạy commit trên.

---

## Task 3: Frontend — mở rộng `TaskFormDialog` (tạo chuỗi lặp + nút Dừng lặp)

**Files:**
- Modify: `apps/web/src/features/tasks/types/task.types.ts` — thêm `recurringTemplateId`, type payload
- Create: `apps/web/src/features/tasks/services/recurring-task.service.ts`
- Create: `apps/web/src/features/tasks/hooks/useRecurringTasks.ts`
- Modify: `apps/web/src/features/tasks/components/TaskFormDialog.tsx`

### Step 1: Type

Modify `apps/web/src/features/tasks/types/task.types.ts` — trong `interface Task`, thêm ngay dưới
dòng `milestoneId: string | null;`:

```typescript
  recurringTemplateId: string | null; // set khi Task này được sinh tự động từ 1 chuỗi lặp
```

Thêm vào cuối file (sau `TaskDeleteResult`, trước hoặc sau `WeeklyTaskStats` đã có):

```typescript
export const RECURRENCE_FREQUENCIES = ["DAILY", "WEEKLY"] as const;
export type RecurrenceFrequency = (typeof RECURRENCE_FREQUENCIES)[number];

/** POST /recurring-tasks payload */
export interface CreateRecurringTaskPayload {
  title: string;
  description?: string;
  impact: number;
  urgency: number;
  estimateMinute?: number;
  projectId: string;
  frequency: RecurrenceFrequency;
  weekDays?: number[]; // ISO weekday 1=T2..7=CN; bắt buộc khi frequency=WEEKLY
  timeOfDay?: string; // "HH:mm"
}

/** RecurringTaskTemplateResponseDto */
export interface RecurringTaskTemplate {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  impact: number;
  urgency: number;
  estimateMinute: number | null;
  frequency: RecurrenceFrequency;
  weekDays: number[];
  timeOfDay: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] Áp dụng 2 thay đổi trên.

### Step 2: Service

Create `apps/web/src/features/tasks/services/recurring-task.service.ts`:

```typescript
import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type {
  CreateRecurringTaskPayload,
  RecurringTaskTemplate,
} from "../types/task.types";

/** Lớp DUY NHẤT gọi API recurring-tasks. */
export const recurringTaskService = {
  async create(payload: CreateRecurringTaskPayload): Promise<RecurringTaskTemplate> {
    const res = await apiClient.post<ApiEnvelope<RecurringTaskTemplate>>(
      "/recurring-tasks",
      payload,
    );
    return res.data.data;
  },

  async stop(id: string): Promise<RecurringTaskTemplate> {
    const res = await apiClient.post<ApiEnvelope<RecurringTaskTemplate>>(
      `/recurring-tasks/${id}/stop`,
    );
    return res.data.data;
  },
};
```

- [ ] Tạo file trên.

### Step 3: Hook

Create `apps/web/src/features/tasks/hooks/useRecurringTasks.ts`:

```typescript
"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recurringTaskService } from "../services/recurring-task.service";
import type { CreateRecurringTaskPayload } from "../types/task.types";
import { taskKeys } from "./useTasks";

export function useCreateRecurringTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRecurringTaskPayload) => recurringTaskService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useStopRecurringTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recurringTaskService.stop(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
```

- [ ] Tạo file trên (import `taskKeys` — kiểm tra đã export trong `useTasks.ts`, đã có sẵn từ
      trước theo code hiện tại).

### Step 4: Mở rộng TaskFormDialog — state + import

Modify `apps/web/src/features/tasks/components/TaskFormDialog.tsx`.

Đổi import (thêm hook mới + type mới):

```typescript
import { useCreateTask, useUpdateTask } from "../hooks/useTasks";
import { useCreateRecurringTask, useStopRecurringTask } from "../hooks/useRecurringTasks";
import { STATUS_LABELS } from "../lib/status";
import {
  RECURRENCE_FREQUENCIES,
  TASK_STATUSES,
  type CreateTaskPayload,
  type RecurrenceFrequency,
  type Task,
  type UpdateTaskPayload,
} from "../types/task.types";
```

Trong component, thêm 2 mutation hook ngay dưới dòng `const updateMut = useUpdateTask();`:

```typescript
  const createRecurringMut = useCreateRecurringTask();
  const stopRecurringMut = useStopRecurringTask();
```

Thêm state lặp lại vào object `form` (chỉ dùng khi TẠO mới, không dùng khi sửa) — thêm 2 field
mới vào `useState` ban đầu, ngay dưới `milestoneId: "",`:

```typescript
    recurrence: "NONE" as "NONE" | RecurrenceFrequency,
    recurrenceWeekDays: [] as number[],
```

Trong `React.useEffect` (phần `else` khi tạo mới), thêm reset 2 field này:

```typescript
      setForm({
        title: "",
        description: "",
        impact: 3,
        urgency: 3,
        estimateMinute: "",
        status: "TODO",
        deadline: "",
        projectId: defaultProjectId ?? "",
        milestoneId: "",
        recurrence: "NONE",
        recurrenceWeekDays: [],
      });
```

(phần `if (task)` giữ nguyên, không thêm gì — sửa task không đổi được tần suất, đúng spec.)

- [ ] Áp dụng các thay đổi trên.

### Step 5: Submit logic — tạo chuỗi lặp thay vì Task thường khi bật "Lặp lại"

Trong `handleSubmit`, phần `else` (nhánh tạo mới, không phải edit) hiện tại:

```typescript
      } else {
        const payload: CreateTaskPayload = { ...common };
        if (form.description.trim()) payload.description = form.description.trim();
        if (form.estimateMinute !== "") payload.estimateMinute = Number(form.estimateMinute);
        if (iso) payload.deadline = iso;
        if (form.projectId) payload.projectId = form.projectId;
        if (form.milestoneId) payload.milestoneId = form.milestoneId;
        await createMut.mutateAsync(payload);
      }
```

Đổi thành:

```typescript
      } else if (form.recurrence !== "NONE") {
        if (form.recurrence === "WEEKLY" && form.recurrenceWeekDays.length === 0) {
          throw new Error("Chọn ít nhất 1 thứ trong tuần cho task lặp hàng tuần");
        }
        await createRecurringMut.mutateAsync({
          title: form.title.trim(),
          impact: Number(form.impact),
          urgency: Number(form.urgency),
          projectId: form.projectId || undefined,
          description: form.description.trim() || undefined,
          estimateMinute: form.estimateMinute !== "" ? Number(form.estimateMinute) : undefined,
          frequency: form.recurrence,
          weekDays: form.recurrence === "WEEKLY" ? form.recurrenceWeekDays : undefined,
        } as any);
      } else {
        const payload: CreateTaskPayload = { ...common };
        if (form.description.trim()) payload.description = form.description.trim();
        if (form.estimateMinute !== "") payload.estimateMinute = Number(form.estimateMinute);
        if (iso) payload.deadline = iso;
        if (form.projectId) payload.projectId = form.projectId;
        if (form.milestoneId) payload.milestoneId = form.milestoneId;
        await createMut.mutateAsync(payload);
      }
```

**Lưu ý quan trọng**: `CreateRecurringTaskPayload.projectId` là **bắt buộc** (không optional như
`CreateTaskPayload.projectId`, vì `RecurringTaskTemplate` luôn cần biết Project — không có khái
niệm "Inbox mặc định" cho chuỗi lặp, đúng theo spec "thuộc về 1 Project cụ thể"). Sửa dòng
`projectId: form.projectId || undefined,` ở trên thành bắt buộc thật:

```typescript
        if (!form.projectId) {
          throw new Error("Chọn Project cho task lặp lại");
        }
```
(thêm NGAY TRƯỚC lời gọi `createRecurringMut.mutateAsync`, thay cho comment `as any` phía trên —
bỏ luôn `as any` sau khi sửa, vì giờ `projectId` chắc chắn là string hợp lệ.)

- [ ] Áp dụng thay đổi trên, xoá `as any`, đảm bảo type khớp `CreateRecurringTaskPayload`.

### Step 6: UI — mục "Lặp lại" trong form (chỉ hiện khi TẠO mới)

Trong JSX, thêm khối mới ngay SAU khối `<div className="space-y-1.5">` chứa `Label htmlFor="deadline"` (Deadline) và TRƯỚC khối hiện lỗi `{error && (...)}`, chỉ render khi `!isEdit`:

```tsx
        {!isEdit && (
          <div className="space-y-1.5 rounded-md border border-border p-3">
            <Label htmlFor="recurrence">Lặp lại</Label>
            <Select
              id="recurrence"
              value={form.recurrence}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  recurrence: e.target.value as typeof f.recurrence,
                  recurrenceWeekDays: [],
                }))
              }
            >
              <option value="NONE">Không</option>
              <option value="DAILY">Hàng ngày</option>
              <option value="WEEKLY">Hàng tuần</option>
            </Select>
            {form.recurrence === "WEEKLY" && (
              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  { d: 1, label: "T2" },
                  { d: 2, label: "T3" },
                  { d: 3, label: "T4" },
                  { d: 4, label: "T5" },
                  { d: 5, label: "T6" },
                  { d: 6, label: "T7" },
                  { d: 7, label: "CN" },
                ].map(({ d, label }) => {
                  const checked = form.recurrenceWeekDays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          recurrenceWeekDays: checked
                            ? f.recurrenceWeekDays.filter((x) => x !== d)
                            : [...f.recurrenceWeekDays, d],
                        }))
                      }
                      className={
                        "h-8 w-10 rounded-md border text-xs font-medium transition-colors " +
                        (checked
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-transparent text-muted-foreground hover:border-primary")
                      }
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}
            {form.recurrence !== "NONE" && (
              <p className="text-xs text-muted-foreground">
                Task lặp lại phải thuộc 1 Project cụ thể (chọn ở mục Project phía trên).
              </p>
            )}
          </div>
        )}
```

- [ ] Áp dụng thay đổi trên (chèn đúng vị trí sau khối Deadline).

### Step 7: UI — nút "Dừng lặp" khi sửa task có recurringTemplateId

Trong JSX, tại khối nút cuối form (`<div className="flex justify-end gap-2 pt-2">`), hiện có 2
nút Huỷ/Lưu. Thêm nút "Dừng lặp" vào TRƯỚC 2 nút đó, chỉ hiện khi đang sửa 1 task có
`recurringTemplateId`:

```tsx
        <div className="flex justify-end gap-2 pt-2">
          {isEdit && task?.recurringTemplateId && (
            <Button
              type="button"
              variant="outline"
              className="mr-auto text-destructive hover:text-destructive"
              disabled={stopRecurringMut.isPending}
              onClick={async () => {
                if (!task.recurringTemplateId) return;
                try {
                  await stopRecurringMut.mutateAsync(task.recurringTemplateId);
                  onOpenChange(false);
                } catch (err) {
                  setError(extractApiErrorMessage(err));
                }
              }}
            >
              {stopRecurringMut.isPending ? "Đang dừng..." : "Dừng lặp"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Huỷ
          </Button>
          <Button type="submit" disabled={submitting || !form.title.trim()}>
            {submitting ? "Đang lưu..." : isEdit ? "Lưu" : "Tạo"}
          </Button>
        </div>
```

(`className="mr-auto ..."` đẩy nút này sang trái, tách biệt khỏi Huỷ/Lưu bên phải.)

Cũng cập nhật biến `submitting` để gộp cả 2 mutation mới:

```typescript
  const submitting =
    createMut.isPending || updateMut.isPending || createRecurringMut.isPending;
```
(sửa dòng `const submitting = createMut.isPending || updateMut.isPending;` hiện có — KHÔNG gộp
`stopRecurringMut` vào đây, nút Dừng lặp tự quản lý trạng thái loading riêng bằng
`stopRecurringMut.isPending` như code ở trên.)

- [ ] Áp dụng các thay đổi trên.

### Step 8: Typecheck

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json`
Expected: 0 lỗi.

- [ ] Chạy lệnh trên, sửa lỗi nếu có (đặc biệt kiểm tra `CreateRecurringTaskPayload` không còn
      field nào optional-mismatch sau khi bỏ `as any` ở Step 5).

### Step 9: Verify bằng Browser tool (nếu có phiên đăng nhập)

Nếu dev server đang chạy và có phiên đăng nhập sẵn (kiểm tra trước khi thử login lại — KHÔNG có
mật khẩu thật để tự đăng nhập mới):
1. Mở `/tasks`, bấm "Tạo Task", chọn 1 Project, chọn "Lặp lại: Hàng tuần", tick T2+T4, Tạo.
2. Xác nhận task mới xuất hiện trong list (nếu hôm nay là T2 hoặc T4) HOẶC không có lỗi nếu hôm
   nay không khớp (kiểm tra Network tab response `POST /recurring-tasks` trả 201).
3. Mở lại 1 task vừa tạo (nếu có), xác nhận nút "Dừng lặp" hiện ra, bấm thử, xác nhận không lỗi.

Nếu KHÔNG có phiên đăng nhập sẵn — bỏ qua bước này, ghi rõ trong báo cáo là chưa verify trực
quan được, dựa vào tsc sạch + test backend pass làm bằng chứng.

- [ ] Thực hiện bước trên (hoặc ghi rõ lý do bỏ qua).

### Step 10: Commit

```bash
git add apps/web/src/features/tasks
git commit -m "Frontend: TaskFormDialog ho tro tao task lap lai + nut Dung lap"
```

- [ ] Chạy commit trên.

---

## Task 4: Cập nhật PLAN.md + deploy

**Files:**
- Modify: `PLAN.md`

- [ ] **Step 1**: Thêm mục "Recurring Task" vào `PLAN.md` (dưới mục Task/Eisenhower Matrix hiện
  có), đánh dấu ✅ Hoàn tất, tóm tắt: model mới, 2 endpoint mới, cron 00:10 hàng ngày, UI mở rộng
  TaskFormDialog. Trỏ tới spec + plan này.

- [ ] **Step 2**: Deploy — commit PLAN.md, push GitHub, SSH vào VPS (`149.118.63.154`, key
  `~/.ssh/oracle-personalos.key`, thư mục `/home/ubuntu/app`), `git pull`,
  `docker compose build api web` (cả 2 đổi), `docker compose up -d api web`, verify
  `curl https://task.hoangdanh.cloud/dashboard` = 200 VÀ kiểm tra log container `api` không lỗi
  khởi động (đặc biệt scheduler mới đăng ký route `POST /recurring-tasks` thành công).

---

## Self-Review (đã chạy)

1. **Spec coverage**: Cả 4 mục quyết định trong spec đều có task tương ứng — tần suất
   DAILY/WEEKLY (Task 1 schema + Task 2 DTO), sinh Task mới mỗi kỳ (Task 2 Step 6), tự động
   archive bỏ lỡ (Task 2 Step 7), nút Dừng lặp trên Task (Task 3 Step 7). Không có gap.
2. **Placeholder scan**: không còn "TBD"/"tương tự Task N" — mọi code block đầy đủ.
3. **Type consistency**: `CreateRecurringTaskDto` (backend) ↔ `CreateRecurringTaskPayload`
   (frontend) khớp field. `RecurringTaskTemplateResponseDto` ↔ `RecurringTaskTemplate` (frontend
   type) khớp field. `recurringTemplateId` xuất hiện nhất quán ở cả 3 lớp (Prisma → DTO → Task
   type frontend).
