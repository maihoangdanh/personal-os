# Trang Analytics tổng hợp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây trang `/analytics` mới tổng hợp số liệu đo lường theo tháng từ 5 module (Task,
Habit, Finance, Goal, Project), so với tháng trước, để người dùng xem hiệu suất cá nhân tổng
thể ở 1 nơi.

**Architecture:** 2 endpoint backend mới tính runtime (không cần bảng snapshot — Task/Habit đã
có bản ghi lịch sử thật gắn timestamp để truy vấn tháng bất kỳ). Finance/Goal/Project tái dùng
100% endpoint đã có. Frontend: 1 trang mới ghép 5 card, mỗi card gọi 1 hook riêng.

**Tech Stack:** NestJS + Prisma (backend, 2 endpoint mới trong module `task`/`habit` có sẵn),
Next.js 15 + React Query (frontend, 1 trang mới + mở rộng service/hook 2 feature có sẵn).

Spec đầy đủ: `docs/superpowers/specs/2026-07-24-analytics-page-design.md`

---

## Task 1: Backend — `GET /tasks/monthly-stats`

**Files:**
- Modify: `apps/api/src/task/task.repository.ts` — đổi tên `weeklyTaskCounts` → `taskCountsInRange` (dùng chung cho cả tuần lẫn tháng, tránh trùng lặp logic where-clause)
- Modify: `apps/api/src/task/task.service.ts` — sửa lời gọi theo tên mới, thêm `monthlyStats()`
- Modify: `apps/api/src/task/task.controller.ts` — thêm route `GET /tasks/monthly-stats`
- Test: `apps/api/src/task/__tests__/task.service.spec.ts`

### Step 1: Đổi tên `weeklyTaskCounts` → `taskCountsInRange` (không đổi logic)

Trong `apps/api/src/task/task.repository.ts`, tìm đoạn:
```typescript
  // ---- Weekly completion stat (Dashboard StatStrip) ----

  /**
   * Tasks "belonging to" a week = deadline in range OR completedAt in range
   * (same inclusion rule as the frontend's "today" widget, scaled to a week).
   * ARCHIVED is excluded — same rationale as elsewhere (no longer an open/live item).
   */
  async weeklyTaskCounts(
    userId: string,
    weekStart: Date,
    weekEnd: Date,
  ): Promise<{ completedCount: number; totalCount: number }> {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      status: { not: TaskStatus.ARCHIVED },
      ...ownedByUser(userId),
      OR: [
        { deadline: { gte: weekStart, lte: weekEnd } },
        { completedAt: { gte: weekStart, lte: weekEnd } },
      ],
    };
    const [totalCount, completedCount] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: TaskStatus.DONE } }),
    ]);
    return { completedCount, totalCount };
  }
```

Đổi thành (đổi tên hàm + tên tham số + comment cho tổng quát, LOGIC BÊN TRONG giữ nguyên y hệt):
```typescript
  // ---- Task completion counts in a date range (Dashboard StatStrip + Analytics) ----

  /**
   * Tasks "belonging to" a date range = deadline in range OR completedAt in range
   * (same inclusion rule as the frontend's "today" widget, scaled to any range —
   * dùng chung cho cả thống kê tuần và tháng). ARCHIVED is excluded — same
   * rationale as elsewhere (no longer an open/live item).
   */
  async taskCountsInRange(
    userId: string,
    rangeStart: Date,
    rangeEnd: Date,
  ): Promise<{ completedCount: number; totalCount: number }> {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      status: { not: TaskStatus.ARCHIVED },
      ...ownedByUser(userId),
      OR: [
        { deadline: { gte: rangeStart, lte: rangeEnd } },
        { completedAt: { gte: rangeStart, lte: rangeEnd } },
      ],
    };
    const [totalCount, completedCount] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: TaskStatus.DONE } }),
    ]);
    return { completedCount, totalCount };
  }
```

- [ ] Áp dụng đổi tên trên.

### Step 2: Sửa lời gọi cũ trong `weeklyStats()`

Trong `apps/api/src/task/task.service.ts`, tìm dòng:
```typescript
    const { completedCount, totalCount } = await this.repo.weeklyTaskCounts(
      userId,
      monday,
      weekEnd,
    );
```
Đổi thành:
```typescript
    const { completedCount, totalCount } = await this.repo.taskCountsInRange(
      userId,
      monday,
      weekEnd,
    );
```

- [ ] Áp dụng đổi tên trên.

### Step 3: Chạy test để xác nhận đổi tên không hồi quy

Run: `cd apps/api && npx jest src/task --no-coverage`
Expected: `Tests: 15 passed, 15 total` (không có test nào tham chiếu trực tiếp tên hàm cũ
`weeklyTaskCounts` trên mock — nếu có, sửa key mock từ `weeklyTaskCounts: jest.fn()` thành
`taskCountsInRange: jest.fn()` trong `beforeEach` của `task.service.spec.ts`).

- [ ] Chạy lệnh trên. Nếu FAIL vì mock key sai tên, sửa `repo = {...}` trong
      `apps/api/src/task/__tests__/task.service.spec.ts` từ `weeklyTaskCounts: jest.fn()` →
      `taskCountsInRange: jest.fn()`, chạy lại tới khi PASS.

### Step 4: Viết test cho `monthlyStats()` (TDD — viết trước, chưa có hàm)

Trong `apps/api/src/task/__tests__/task.service.spec.ts`, thêm vào cuối `describe('TaskService', ...)`
(trước dấu đóng `});` cuối file), và thêm mock `taskCountsInRange` vào `repo` trong `beforeEach`
nếu Step 3 chưa thêm:

```typescript
  describe('monthlyStats', () => {
    it('computes completionPercent for the given month, no previous month data -> null', async () => {
      repo.taskCountsInRange
        .mockResolvedValueOnce({ completedCount: 6, totalCount: 10 }) // tháng được chọn
        .mockResolvedValueOnce({ completedCount: 0, totalCount: 0 }); // tháng trước
      const res = await service.monthlyStats(userId, '2026-07');
      expect(res.month).toBe('2026-07');
      expect(res.completionPercent).toBe(60);
      expect(res.previousMonth).toBeNull();
      expect(res.changePercent).toBeNull();
    });

    it('computes changePercent as percentage-point delta vs previous month', async () => {
      repo.taskCountsInRange
        .mockResolvedValueOnce({ completedCount: 8, totalCount: 10 }) // 80%, tháng chọn
        .mockResolvedValueOnce({ completedCount: 5, totalCount: 10 }); // 50%, tháng trước
      const res = await service.monthlyStats(userId, '2026-07');
      expect(res.completionPercent).toBe(80);
      expect(res.previousMonth).toEqual({ month: '2026-06', completionPercent: 50 });
      expect(res.changePercent).toBe(30);
    });

    it('handles January -> rolls back to December of previous year', async () => {
      repo.taskCountsInRange
        .mockResolvedValueOnce({ completedCount: 1, totalCount: 2 })
        .mockResolvedValueOnce({ completedCount: 1, totalCount: 1 });
      const res = await service.monthlyStats(userId, '2026-01');
      expect(res.previousMonth?.month).toBe('2025-12');
    });

    it('returns 0% when the month has no tasks (no division by zero)', async () => {
      repo.taskCountsInRange
        .mockResolvedValueOnce({ completedCount: 0, totalCount: 0 })
        .mockResolvedValueOnce({ completedCount: 0, totalCount: 0 });
      const res = await service.monthlyStats(userId, '2026-07');
      expect(res.completionPercent).toBe(0);
    });

    it('defaults to the current month when no month argument given', async () => {
      repo.taskCountsInRange
        .mockResolvedValueOnce({ completedCount: 0, totalCount: 0 })
        .mockResolvedValueOnce({ completedCount: 0, totalCount: 0 });
      const res = await service.monthlyStats(userId);
      const now = new Date();
      const expectedMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
      expect(res.month).toBe(expectedMonth);
    });
  });
```

- [ ] Thêm test trên vào cuối file (trước `});` đóng describe ngoài cùng).

- [ ] **Chạy test, xác nhận FAIL** (chưa có `monthlyStats`):

Run: `cd apps/api && npx jest src/task --no-coverage`
Expected: FAIL — `service.monthlyStats is not a function`

### Step 5: Viết `monthlyStats()` để test pass

Trong `apps/api/src/task/task.service.ts`, thêm helper functions ngay dưới `round1()` đã có
(không đổi 3 hàm `mondayOf`/`dateLabel`/`round1` hiện có):

```typescript
/** "YYYY-MM" (mặc định tháng hiện tại, UTC) → { from, to, month } của tháng đó. */
function monthRange(month?: string): { from: Date; to: Date; month: string } {
  const now = new Date();
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth(); // 0-based
  if (month) {
    const [yy, mm] = month.split('-').map(Number);
    y = yy;
    m = mm - 1;
  }
  const from = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  const label = `${y}-${String(m + 1).padStart(2, '0')}`;
  return { from, to, month: label };
}

/** "YYYY-MM" của tháng liền trước (xử lý đúng rollover qua năm, vd 2026-01 -> 2025-12). */
function previousMonthLabel(label: string): string {
  const [y, m] = label.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1)); // m 1-based; lùi thêm 1 tháng nữa
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
```

Thêm method `monthlyStats` vào class `TaskService`, ngay sau method `weeklyStats` đã có:

```typescript
  /**
   * Trang Analytics — % task hoàn thành trong 1 tháng bất kỳ + so với tháng trước.
   * KHÔNG upsert snapshot (khác weeklyStats) — tính hoàn toàn runtime vì Task đã
   * là bản ghi lịch sử thật (deadline/completedAt), không cần tích luỹ qua cron.
   */
  async monthlyStats(userId: string, month?: string) {
    const { from, to, month: label } = monthRange(month);
    const { completedCount, totalCount } = await this.repo.taskCountsInRange(
      userId,
      from,
      to,
    );
    const completionPercent =
      totalCount > 0 ? round1((completedCount / totalCount) * 100) : 0;

    const prevLabel = previousMonthLabel(label);
    const prevRange = monthRange(prevLabel);
    const prevCounts = await this.repo.taskCountsInRange(
      userId,
      prevRange.from,
      prevRange.to,
    );

    let previousMonth: { month: string; completionPercent: number } | null = null;
    let changePercent: number | null = null;
    if (prevCounts.totalCount > 0) {
      const prevPercent = round1(
        (prevCounts.completedCount / prevCounts.totalCount) * 100,
      );
      previousMonth = { month: prevLabel, completionPercent: prevPercent };
      changePercent = round1(completionPercent - prevPercent);
    }

    return {
      month: label,
      completedCount,
      totalCount,
      completionPercent,
      previousMonth,
      changePercent,
    };
  }
```

- [ ] Áp dụng thay đổi trên.

- [ ] **Chạy lại test, xác nhận PASS:**

Run: `cd apps/api && npx jest src/task --no-coverage`
Expected: `Tests: 20 passed, 20 total` (15 cũ + 5 mới của `monthlyStats`)

### Step 6: Controller — route mới (đăng ký TRƯỚC `:id`)

Trong `apps/api/src/task/task.controller.ts`, thêm ngay sau route `weeklyStats` đã có:

```typescript
  /** Cùng lý do đăng ký trước :id như weekly-stats ở trên. */
  @Get('monthly-stats')
  monthlyStats(
    @CurrentUser() user: AuthUser,
    @Query('month') month?: string,
  ) {
    return this.tasks.monthlyStats(user.userId, month);
  }
```

(đặt ngay sau khối `weeklyStats` hiện có, vẫn TRƯỚC `@Get(':id')`)

- [ ] Áp dụng thay đổi trên.

### Step 7: Build + test toàn bộ backend

Run: `cd apps/api && npm run build`
Expected: sạch, không lỗi tsc.

Run: `cd apps/api && npm test`
Expected: tất cả suite pass, tổng số test tăng thêm 5 (không hồi quy suite khác).

- [ ] Chạy 2 lệnh trên, xác nhận đúng Expected.

### Step 8: Commit

```bash
git add apps/api/src/task
git commit -m "Backend: GET /tasks/monthly-stats cho trang Analytics"
```

- [ ] Chạy commit trên.

---

## Task 2: Backend — `GET /habits/monthly-stats`

**Files:**
- Modify: `apps/api/src/habit/habit.repository.ts` — thêm `countLogsInRange`
- Modify: `apps/api/src/habit/habit.service.ts` — thêm `monthlyStats()`
- Modify: `apps/api/src/habit/habit.controller.ts` — thêm route `GET /habits/monthly-stats`
- Test: `apps/api/src/habit/__tests__/habit.service.spec.ts`

### Step 1: Repository — đếm check-in trong khoảng ngày

Trong `apps/api/src/habit/habit.repository.ts`, thêm method mới vào cuối class (sau
`findLogDates`):

```typescript
  /** Tổng số HabitLog (mọi habit của user) có logDate trong khoảng [from, to]. */
  countLogsInRange(userId: string, from: Date, to: Date): Promise<number> {
    return prisma.habitLog.count({
      where: {
        deletedAt: null,
        logDate: { gte: from, lte: to },
        habit: { userId, deletedAt: null },
      },
    });
  }
```

- [ ] Áp dụng thay đổi trên.

### Step 2: Viết test cho `monthlyStats()` (TDD)

Trong `apps/api/src/habit/__tests__/habit.service.spec.ts`, thêm vào cuối
`describe('HabitService', ...)` (trước dấu đóng cuối cùng), và thêm mock
`countLogsInRange: jest.fn()` vào object `repo` trong `beforeEach`:

```typescript
  describe('monthlyStats', () => {
    it('computes checkinCount for the month + habitCount + longestCurrentStreak', async () => {
      repo.findManyScoped.mockResolvedValue([
        makeHabit({ id: 'habit-1', name: 'Đọc sách' }),
        makeHabit({ id: 'habit-2', name: 'Tập thể dục' }),
      ]);
      repo.countLogsInRange
        .mockResolvedValueOnce(20) // tháng được chọn
        .mockResolvedValueOnce(15); // tháng trước
      repo.findLogDates.mockImplementation((habitId: string) =>
        Promise.resolve(
          habitId === 'habit-1'
            ? [{ logDate: utc('2026-07-16') }, { logDate: utc('2026-07-15') }]
            : [{ logDate: utc('2026-07-10') }],
        ),
      );

      const res = await service.monthlyStats(userId, '2026-07');
      expect(res.month).toBe('2026-07');
      expect(res.checkinCount).toBe(20);
      expect(res.habitCount).toBe(2);
      expect(res.previousMonth).toEqual({ month: '2026-06', checkinCount: 15 });
      // (20-15)/15*100 = 33.3
      expect(res.changePercent).toBeCloseTo(33.3, 1);
    });

    it('previousMonth is null when last month has 0 check-ins (avoid divide-by-zero)', async () => {
      repo.findManyScoped.mockResolvedValue([]);
      repo.countLogsInRange.mockResolvedValueOnce(5).mockResolvedValueOnce(0);
      const res = await service.monthlyStats(userId, '2026-07');
      expect(res.previousMonth).toBeNull();
      expect(res.changePercent).toBeNull();
    });

    it('longestCurrentStreak is null when there are no habits', async () => {
      repo.findManyScoped.mockResolvedValue([]);
      repo.countLogsInRange.mockResolvedValueOnce(0).mockResolvedValueOnce(0);
      const res = await service.monthlyStats(userId, '2026-07');
      expect(res.longestCurrentStreak).toBeNull();
      expect(res.habitCount).toBe(0);
    });
  });
```

Đảm bảo `beforeEach` có thêm mock:
```typescript
      countLogsInRange: jest.fn(),
```
(thêm vào object `repo = {...}` hiện có, ngay dưới dòng `findLogDates: jest.fn(),`)

- [ ] Thêm mock + test trên.

- [ ] **Chạy test, xác nhận FAIL:**

Run: `cd apps/api && npx jest src/habit --no-coverage`
Expected: FAIL — `service.monthlyStats is not a function`

### Step 3: Viết `monthlyStats()` để test pass

Trong `apps/api/src/habit/habit.service.ts`, thêm helper ở đầu file (dưới các import, trước
`@Injectable()`):

```typescript
/** "YYYY-MM" (mặc định tháng hiện tại, UTC) → { from, to, month } của tháng đó. */
function monthRange(month?: string): { from: Date; to: Date; month: string } {
  const now = new Date();
  let y = now.getUTCFullYear();
  let m = now.getUTCMonth();
  if (month) {
    const [yy, mm] = month.split('-').map(Number);
    y = yy;
    m = mm - 1;
  }
  const from = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
  const label = `${y}-${String(m + 1).padStart(2, '0')}`;
  return { from, to, month: label };
}

/** "YYYY-MM" của tháng liền trước (xử lý đúng rollover qua năm). */
function previousMonthLabel(label: string): string {
  const [y, m] = label.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
```

Thêm method `monthlyStats` vào class `HabitService`, ngay sau method `streak` đã có:

```typescript
  /**
   * Trang Analytics — tổng check-in trong 1 tháng bất kỳ (mọi habit) + so tháng
   * trước + streak dài nhất hiện tại. changePercent ở đây là % THAY ĐỔI TƯƠNG ĐỐI
   * của SỐ LƯỢNG check-in (khác Task dùng điểm phần trăm — vì đây không phải tỉ lệ %).
   */
  async monthlyStats(userId: string, month?: string) {
    const { from, to, month: label } = monthRange(month);
    const checkinCount = await this.repo.countLogsInRange(userId, from, to);

    const prevLabel = previousMonthLabel(label);
    const prevRange = monthRange(prevLabel);
    const prevCheckinCount = await this.repo.countLogsInRange(
      userId,
      prevRange.from,
      prevRange.to,
    );

    let previousMonth: { month: string; checkinCount: number } | null = null;
    let changePercent: number | null = null;
    if (prevCheckinCount > 0) {
      previousMonth = { month: prevLabel, checkinCount: prevCheckinCount };
      changePercent = round1(
        ((checkinCount - prevCheckinCount) / prevCheckinCount) * 100,
      );
    }

    const habits = await this.repo.findManyScoped(userId);
    let longestCurrentStreak: { habitName: string; currentStreak: number } | null =
      null;
    for (const habit of habits) {
      const rows = await this.repo.findLogDates(habit.id);
      const { currentStreak } = computeStreak(
        rows.map((r) => r.logDate),
        toUtcDateOnly(),
      );
      if (!longestCurrentStreak || currentStreak > longestCurrentStreak.currentStreak) {
        longestCurrentStreak = { habitName: habit.name, currentStreak };
      }
    }

    return {
      month: label,
      checkinCount,
      previousMonth,
      changePercent,
      habitCount: habits.length,
      longestCurrentStreak,
    };
  }
```

- [ ] Áp dụng thay đổi trên.

- [ ] **Chạy lại test, xác nhận PASS:**

Run: `cd apps/api && npx jest src/habit --no-coverage`
Expected: tất cả pass, tăng thêm 3 test mới.

### Step 4: Controller — route mới (đăng ký TRƯỚC `:id`)

Trong `apps/api/src/habit/habit.controller.ts`, thêm import `Query` vào dòng import
`@nestjs/common` hiện có:
```typescript
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
```

Thêm route mới ngay sau `@Post()` `create()`, TRƯỚC `@Get(':id')`:

```typescript
  /** Phải đăng ký TRƯỚC @Get(':id') — không thì "monthly-stats" bị nuốt vào :id. */
  @Get('monthly-stats')
  monthlyStats(
    @CurrentUser() user: AuthUser,
    @Query('month') month?: string,
  ) {
    return this.habits.monthlyStats(user.userId, month);
  }
```

- [ ] Áp dụng 2 thay đổi trên.

### Step 5: Build + test toàn bộ backend

Run: `cd apps/api && npm run build`
Expected: sạch.

Run: `cd apps/api && npm test`
Expected: tất cả pass, tổng test tăng thêm 3 (cộng dồn với Task 1: +5 Task, +3 Habit = +8 so
với baseline 138 → **146**).

- [ ] Chạy 2 lệnh trên, xác nhận đúng Expected.

### Step 6: Commit

```bash
git add apps/api/src/habit
git commit -m "Backend: GET /habits/monthly-stats cho trang Analytics"
```

- [ ] Chạy commit trên.

---

## Task 3: Frontend — type/service/hook cho 2 endpoint mới

**Files:**
- Modify: `apps/web/src/features/tasks/types/task.types.ts` — thêm `MonthlyTaskStats`
- Modify: `apps/web/src/features/tasks/services/task.service.ts` — thêm `monthlyStats(month?)`
- Modify: `apps/web/src/features/tasks/hooks/useTasks.ts` — thêm `useTaskMonthlyStats(month?)`
- Modify: `apps/web/src/features/habit/types/habit.types.ts` — thêm `MonthlyHabitStats`
- Modify: `apps/web/src/features/habit/services/habit.service.ts` — thêm `monthlyStats(month?)`
- Modify: `apps/web/src/features/habit/hooks/useHabits.ts` — thêm `useHabitMonthlyStats(month?)`

### Step 1: Type Task

Trong `apps/web/src/features/tasks/types/task.types.ts`, thêm vào cuối file (sau
`WeeklyTaskStats` đã có):

```typescript
/** GET /tasks/monthly-stats response data — trang Analytics. */
export interface MonthlyTaskStats {
  month: string; // "YYYY-MM"
  completedCount: number;
  totalCount: number;
  completionPercent: number;
  previousMonth: { month: string; completionPercent: number } | null;
  changePercent: number | null; // điểm phần trăm chênh lệch
}
```

- [ ] Thêm type trên.

### Step 2: Service Task

Trong `apps/web/src/features/tasks/services/task.service.ts`, thêm import `MonthlyTaskStats`
vào khối import type hiện có (cùng dòng với `WeeklyTaskStats`), và thêm method vào cuối object
`taskService` (sau `weeklyStats`):

```typescript
  async monthlyStats(month?: string): Promise<MonthlyTaskStats> {
    const res = await apiClient.get<ApiEnvelope<MonthlyTaskStats>>(
      "/tasks/monthly-stats",
      { params: month ? { month } : undefined },
    );
    return res.data.data;
  },
```

- [ ] Áp dụng 2 thay đổi trên.

### Step 3: Hook Task

Trong `apps/web/src/features/tasks/hooks/useTasks.ts`, thêm import `MonthlyTaskStats` vào khối
import type hiện có, và thêm hook mới vào cuối file:

```typescript
export function useTaskMonthlyStats(month?: string) {
  return useQuery<MonthlyTaskStats>({
    queryKey: ["tasks", "monthlyStats", month ?? "current"],
    queryFn: () => taskService.monthlyStats(month),
    staleTime: 60_000,
  });
}
```

- [ ] Áp dụng 2 thay đổi trên.

### Step 4: Type Habit

Trong `apps/web/src/features/habit/types/habit.types.ts`, thêm vào cuối file:

```typescript
/** GET /habits/monthly-stats response data — trang Analytics. */
export interface MonthlyHabitStats {
  month: string; // "YYYY-MM"
  checkinCount: number;
  previousMonth: { month: string; checkinCount: number } | null;
  changePercent: number | null; // % thay đổi TƯƠNG ĐỐI của số lượng check-in
  habitCount: number;
  longestCurrentStreak: { habitName: string; currentStreak: number } | null;
}
```

- [ ] Thêm type trên.

### Step 5: Service Habit

Trong `apps/web/src/features/habit/services/habit.service.ts`, thêm import `MonthlyHabitStats`
vào khối import type hiện có, và thêm method vào cuối object `habitService`:

```typescript
  async monthlyStats(month?: string): Promise<MonthlyHabitStats> {
    const res = await apiClient.get<ApiEnvelope<MonthlyHabitStats>>(
      "/habits/monthly-stats",
      { params: month ? { month } : undefined },
    );
    return res.data.data;
  },
```

- [ ] Áp dụng 2 thay đổi trên.

### Step 6: Hook Habit

Trong `apps/web/src/features/habit/hooks/useHabits.ts`, thêm import `useQuery`/`MonthlyHabitStats`
nếu chưa có (kiểm tra import hiện tại của file trước khi sửa), và thêm hook mới vào cuối file:

```typescript
export function useHabitMonthlyStats(month?: string) {
  return useQuery<MonthlyHabitStats>({
    queryKey: ["habits", "monthlyStats", month ?? "current"],
    queryFn: () => habitService.monthlyStats(month),
    staleTime: 60_000,
  });
}
```

- [ ] Áp dụng thay đổi trên.

### Step 7: Typecheck

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json`
Expected: 0 lỗi.

- [ ] Chạy lệnh trên, sửa lỗi nếu có.

### Step 8: Commit

```bash
git add apps/web/src/features/tasks apps/web/src/features/habit
git commit -m "Frontend: type/service/hook cho monthly-stats (Task + Habit)"
```

- [ ] Chạy commit trên.

---

## Task 4: Frontend — trang Analytics + Sidebar

**Files:**
- Create: `apps/web/src/features/analytics/components/AnalyticsView.tsx`
- Create: `apps/web/src/app/(app)/analytics/page.tsx`
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

### Step 1: Sidebar — thêm mục Analytics

Trong `apps/web/src/components/layout/Sidebar.tsx`, thêm icon `BarChart3` vào import
`lucide-react` hiện có (thêm vào danh sách đang import, giữ nguyên thứ tự alphabet nếu có):

```typescript
import {
  Bell,
  BarChart3,
  BookOpen,
  Bot,
  CalendarDays,
  FolderKanban,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Moon,
  Repeat,
  Settings,
  Sun,
  Target,
  Wallet,
} from "lucide-react";
```

Thêm nhóm mới vào mảng `NAV_GROUPS`, ngay sau nhóm `"Finance"` và TRƯỚC nhóm `"Assistant"`:

```typescript
  {
    label: "Analytics",
    items: [{ href: "/analytics", label: "Analytics", icon: BarChart3 }],
  },
```

- [ ] Áp dụng 2 thay đổi trên (đọc file thật trước khi sửa để chèn đúng vị trí, không phá cấu
      trúc mảng hiện có).

### Step 2: Trang AnalyticsView — khung + bộ chọn tháng

Create `apps/web/src/features/analytics/components/AnalyticsView.tsx`:

```tsx
"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { BarChart3, FolderKanban, ListChecks, Repeat, Target, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { CardLink } from "@/components/layout/CardLink";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useTaskMonthlyStats } from "@/features/tasks/hooks/useTasks";
import { useHabitMonthlyStats } from "@/features/habit/hooks/useHabits";
import { useFinanceReport } from "@/features/finance/hooks/useFinance";
import { useGoals } from "@/features/goals/hooks/useGoals";
import { useProjects } from "@/features/projects/hooks/useProjects";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Dịch "YYYY-MM" tới/lui theo số tháng. */
function shiftMonth(m: string, dir: 1 | -1): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + dir, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Nhãn "Tháng M, YYYY" từ "YYYY-MM". */
function monthLabel(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return `Tháng ${mo}, ${y}`;
}

interface AnalyticsCard {
  key: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  sub: string;
  changeLabel: string | null; // null = ẩn hẳn badge (Goal/Project không so tháng trước)
  changePositive: boolean;
  href: string;
  isLoading: boolean;
}

export function AnalyticsView() {
  const [month, setMonth] = React.useState(() => currentMonth());
  const isCurrent = month === currentMonth();
  const prevMonthLabel = shiftMonth(month, -1);

  const taskStats = useTaskMonthlyStats(month);
  const habitStats = useHabitMonthlyStats(month);
  const report = useFinanceReport(month);
  const prevReport = useFinanceReport(prevMonthLabel);
  const goals = useGoals({ status: "ACTIVE" });
  const projects = useProjects({ status: "ACTIVE" });

  const goalAvgProgress = React.useMemo(() => {
    if (!goals.data || goals.data.length === 0) return 0;
    return Math.round(
      goals.data.reduce((sum, g) => sum + g.progress, 0) / goals.data.length,
    );
  }, [goals.data]);

  const projectAvgProgress = React.useMemo(() => {
    if (!projects.data || projects.data.length === 0) return 0;
    return Math.round(
      projects.data.reduce((sum, p) => sum + p.progress, 0) / projects.data.length,
    );
  }, [projects.data]);

  const savingRateChange =
    report.data && prevReport.data && !isNaN(prevReport.data.savingRatePercent)
      ? Math.round((report.data.savingRatePercent - prevReport.data.savingRatePercent) * 10) / 10
      : null;

  const cards: AnalyticsCard[] = [
    {
      key: "task",
      icon: ListChecks,
      title: "Task hoàn thành",
      value: taskStats.data ? `${taskStats.data.completedCount}/${taskStats.data.totalCount}` : "—",
      sub: taskStats.data ? `${taskStats.data.completionPercent}% hoàn thành` : "",
      changeLabel:
        taskStats.data?.changePercent != null
          ? `${taskStats.data.changePercent >= 0 ? "▲" : "▼"} ${taskStats.data.changePercent >= 0 ? "+" : ""}${taskStats.data.changePercent}% so với tháng trước`
          : null,
      changePositive: (taskStats.data?.changePercent ?? 0) >= 0,
      href: "/tasks",
      isLoading: taskStats.isLoading,
    },
    {
      key: "habit",
      icon: Repeat,
      title: "Check-in thói quen",
      value: habitStats.data ? `${habitStats.data.checkinCount}` : "—",
      sub: habitStats.data?.longestCurrentStreak
        ? `Streak dài nhất: ${habitStats.data.longestCurrentStreak.currentStreak} ngày (${habitStats.data.longestCurrentStreak.habitName})`
        : `${habitStats.data?.habitCount ?? 0} habit`,
      changeLabel:
        habitStats.data?.changePercent != null
          ? `${habitStats.data.changePercent >= 0 ? "▲" : "▼"} ${habitStats.data.changePercent >= 0 ? "+" : ""}${habitStats.data.changePercent}% so với tháng trước`
          : null,
      changePositive: (habitStats.data?.changePercent ?? 0) >= 0,
      href: "/habits",
      isLoading: habitStats.isLoading,
    },
    {
      key: "finance",
      icon: Wallet,
      title: "Tỷ lệ tiết kiệm",
      value: report.data ? `${report.data.savingRatePercent.toFixed(1)}%` : "—",
      sub: report.data ? `Thu ${report.data.income.toLocaleString("vi-VN")}₫` : "",
      changeLabel:
        savingRateChange != null
          ? `${savingRateChange >= 0 ? "▲" : "▼"} ${savingRateChange >= 0 ? "+" : ""}${savingRateChange}% so với tháng trước`
          : null,
      changePositive: (savingRateChange ?? 0) >= 0,
      href: "/finance",
      isLoading: report.isLoading,
    },
    {
      key: "goal",
      icon: Target,
      title: "Goal đang chạy",
      value: goals.data ? `${goals.data.length}` : "—",
      sub: goals.data ? `Trung bình ${goalAvgProgress}% tiến độ` : "",
      changeLabel: null,
      changePositive: true,
      href: "/goals",
      isLoading: goals.isLoading,
    },
    {
      key: "project",
      icon: FolderKanban,
      title: "Project đang chạy",
      value: projects.data ? `${projects.data.length}` : "—",
      sub: projects.data ? `Trung bình ${projectAvgProgress}% tiến độ` : "",
      changeLabel: null,
      changePositive: true,
      href: "/projects",
      isLoading: projects.isLoading,
    },
  ];

  const anyError =
    taskStats.isError || habitStats.isError || report.isError || goals.isError || projects.isError;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="ĐO LƯỜNG"
        title="Analytics"
        description="Tổng hợp hiệu suất cá nhân theo tháng — Task, Habit, Finance, Goal, Project."
        actions={
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              title="Tháng trước"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[130px] text-center font-mono text-[12.5px] font-semibold tracking-[0.04em]">
              {monthLabel(month)}
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              disabled={isCurrent}
              title="Tháng sau"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            {!isCurrent && (
              <Button variant="outline" size="sm" onClick={() => setMonth(currentMonth())}>
                Tháng này
              </Button>
            )}
          </div>
        }
      />

      {anyError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {extractApiErrorMessage(
            taskStats.error ?? habitStats.error ?? report.error ?? goals.error ?? projects.error,
          )}
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <div key={c.key} className="rounded-lg border border-border bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[15px] font-bold">
                <c.icon className="h-4 w-4 text-primary" />
                {c.title}
              </div>
              <CardLink href={c.href}>Xem chi tiết →</CardLink>
            </div>
            {c.isLoading ? (
              <div className="h-14 animate-pulse rounded-md bg-muted" />
            ) : (
              <>
                <div className="font-serif text-[26px] font-semibold">{c.value}</div>
                {c.sub && <div className="mt-0.5 text-[12px] text-muted-foreground">{c.sub}</div>}
                {c.changeLabel && (
                  <div
                    className={
                      "mt-1.5 text-[11.5px] font-medium " +
                      (c.changePositive ? "text-success" : "text-destructive")
                    }
                  >
                    {c.changeLabel}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] Tạo file trên. Trước khi tạo, đọc `apps/web/src/features/finance/hooks/useFinance.ts` để
      xác nhận `useFinanceReport` export đúng tên (đã xác nhận trong spec — không đổi gì thêm),
      và đọc `apps/web/src/features/goals/hooks/useGoals.ts` + `useProjects.ts` để xác nhận field
      `progress` tồn tại đúng tên trên `Goal`/`Project` type trả về từ các hook này.

### Step 3: Route page

Create `apps/web/src/app/(app)/analytics/page.tsx`:

```tsx
import { AnalyticsView } from "@/features/analytics/components/AnalyticsView";

export default function AnalyticsPage() {
  return <AnalyticsView />;
}
```

- [ ] Tạo file trên.

### Step 4: Typecheck

Run: `cd apps/web && npx tsc --noEmit -p tsconfig.json`
Expected: 0 lỗi.

- [ ] Chạy lệnh trên, sửa lỗi nếu có (đặc biệt kiểm tra tên field `progress` trên
      `Goal`/`Project` khớp đúng, và `useFinanceReport`/`useGoals`/`useProjects` import đúng
      đường dẫn).

### Step 5: Verify bằng Browser tool (nếu có phiên đăng nhập)

Nếu dev server đang chạy và có phiên đăng nhập sẵn:
1. Mở `/analytics`, xác nhận Sidebar có mục "Analytics" mới, click vào.
2. Xác nhận 5 card hiện đủ: Task, Habit, Finance, Goal, Project — không lỗi console.
3. Bấm ‹ Tháng trước, xác nhận số liệu đổi theo, card Task/Habit/Finance có badge % thay đổi,
   card Goal/Project KHÔNG có badge (đúng thiết kế).
4. Bấm "Xem chi tiết →" ở card bất kỳ, xác nhận chuyển đúng trang.

Nếu KHÔNG có phiên đăng nhập sẵn (không có mật khẩu thật để tự đăng nhập mới) — bỏ qua bước
này, ghi rõ trong báo cáo, dựa vào tsc sạch + test backend pass làm bằng chứng.

- [ ] Thực hiện bước trên (hoặc ghi rõ lý do bỏ qua).

### Step 6: Commit

```bash
git add apps/web/src/features/analytics apps/web/src/app apps/web/src/components/layout/Sidebar.tsx
git commit -m "Frontend: trang Analytics tong hop + muc Sidebar"
```

- [ ] Chạy commit trên.

---

## Task 5: PLAN.md + deploy

**Files:**
- Modify: `PLAN.md`

- [ ] **Step 1**: Thêm mục "Analytics" mới vào `PLAN.md` (dưới mục Phase 3 Finance hoặc thành
  mục riêng sau Phase 4, tuỳ vị trí hợp lý khi đọc file thật) — đánh dấu ✅ Hoàn tất, tóm tắt: 2
  endpoint mới (`/tasks/monthly-stats`, `/habits/monthly-stats`), trang `/analytics` mới, Goal/
  Project chỉ hiện số hiện tại (không so tháng trước — quyết định có chủ đích, xem spec). Trỏ
  tới spec + plan này.

- [ ] **Step 2**: Deploy — commit PLAN.md, push GitHub, SSH vào VPS (`149.118.63.154`, key
  `~/.ssh/oracle-personalos.key`, thư mục `/home/ubuntu/app`), `git pull`,
  `docker compose build api web` (cả 2 đổi), `docker compose up -d api web`, verify
  `curl https://task.hoangdanh.cloud/dashboard` = 200 VÀ log container `api` không lỗi khởi
  động (đặc biệt route `/tasks/monthly-stats` + `/habits/monthly-stats` map đúng trước `:id`).

---

## Self-Review (đã chạy)

1. **Spec coverage**: Cả 5 mục quyết định trong spec đều có task tương ứng — trang Analytics
   riêng (Task 4), 5 module (Task 4 Step 2 — 5 card), snapshot + so tháng trước cho Task/Habit/
   Finance (Task 1, 2, 4), vị trí Sidebar (Task 4 Step 1), kỳ theo tháng có chọn (Task 4 Step 2
   bộ chọn tháng). Không có gap.
2. **Placeholder scan**: không còn "TBD"/"tương tự Task N" — mọi code block đầy đủ, kể cả test.
3. **Type consistency**: `MonthlyTaskStats`/`MonthlyHabitStats` (frontend) khớp đúng field response
   backend (`monthlyStats()` trong `task.service.ts`/`habit.service.ts`). Tên hàm
   `taskCountsInRange` nhất quán xuyên suốt Task 1 (đổi tên 1 lần, dùng lại đúng tên mới ở mọi
   chỗ tham chiếu). `useTaskMonthlyStats`/`useHabitMonthlyStats` khớp tên export dùng ở Task 4.
