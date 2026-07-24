import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { CheckinHabitDto } from './dto/checkin-habit.dto';
import { CreateHabitDto } from './dto/create-habit.dto';
import { HabitLogResponseDto } from './dto/habit-log-response.dto';
import { HabitResponseDto } from './dto/habit-response.dto';
import { StreakResponseDto } from './dto/streak-response.dto';
import { UpdateHabitDto } from './dto/update-habit.dto';
import { computeStreak, toUtcDateOnly } from './habit-date.util';
import { HabitRepository } from './habit.repository';

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

function dateLabel(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Danh sách "YYYY-MM-DD" cho mọi ngày thật trong tháng (tự động đúng năm nhuận). */
function daysInMonthList(label: string): string[] {
  const [y, m] = label.split('-').map(Number);
  const total = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: total }, (_, i) => `${label}-${String(i + 1).padStart(2, '0')}`);
}

@Injectable()
export class HabitService {
  constructor(
    private readonly repo: HabitRepository,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateHabitDto): Promise<HabitResponseDto> {
    const habit = await this.repo.create({
      userId,
      name: dto.name,
      description: dto.description ?? null,
      frequency: dto.frequency ?? 'DAILY',
      targetPerPeriod: dto.targetPerPeriod ?? 1,
    });
    await this.audit.record({
      userId,
      action: 'habit.create',
      entityType: 'Habit',
      entityId: habit.id,
    });
    return HabitResponseDto.from(habit);
  }

  async list(userId: string): Promise<HabitResponseDto[]> {
    const habits = await this.repo.findManyScoped(userId);
    return habits.map(HabitResponseDto.from);
  }

  async get(userId: string, id: string): Promise<HabitResponseDto> {
    const habit = await this.assertHabitExists(id, userId);
    return HabitResponseDto.from(habit);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateHabitDto,
  ): Promise<HabitResponseDto> {
    await this.assertHabitExists(id, userId);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.frequency !== undefined) data.frequency = dto.frequency;
    if (dto.targetPerPeriod !== undefined) {
      data.targetPerPeriod = dto.targetPerPeriod;
    }

    const habit = await this.repo.update(id, data);
    await this.audit.record({
      userId,
      action: 'habit.update',
      entityType: 'Habit',
      entityId: id,
      metadata: { fields: Object.keys(data) },
    });
    return HabitResponseDto.from(habit);
  }

  async remove(
    userId: string,
    id: string,
  ): Promise<{ id: string; deleted: true }> {
    await this.assertHabitExists(id, userId);
    await this.repo.softDelete(id);
    await this.audit.record({
      userId,
      action: 'habit.delete',
      entityType: 'Habit',
      entityId: id,
    });
    return { id, deleted: true };
  }

  /**
   * Check in for today. One log per habit per day (schema @@unique). A second
   * check-in on the same day is rejected with 409 Conflict (non-idempotent).
   */
  async checkin(
    userId: string,
    id: string,
    dto: CheckinHabitDto,
  ): Promise<HabitLogResponseDto> {
    await this.assertHabitExists(id, userId);
    const logDate = toUtcDateOnly();

    const existing = await this.repo.findLogForDate(id, logDate);
    if (existing) {
      throw new ConflictException('Habit already checked in for today');
    }

    const log = await this.repo.createLog({
      habitId: id,
      logDate,
      value: dto.value ?? 1,
      note: dto.note ?? null,
    });
    await this.audit.record({
      userId,
      action: 'habit.checkin',
      entityType: 'Habit',
      entityId: id,
      metadata: { habitLogId: log.id },
    });
    return HabitLogResponseDto.from(log);
  }

  async streak(userId: string, id: string): Promise<StreakResponseDto> {
    await this.assertHabitExists(id, userId);
    const rows = await this.repo.findLogDates(id);
    const result = computeStreak(
      rows.map((r) => r.logDate),
      toUtcDateOnly(),
    );
    return {
      habitId: id,
      currentStreak: result.currentStreak,
      lastLogDate: result.lastLogDate,
      checkedInToday: result.checkedInToday,
    };
  }

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

  /**
   * Trang Analytics — heatmap kiểu GitHub: mỗi habit + danh sách ngày đã check-in
   * trong tháng (để frontend tô đậm đúng ô).
   */
  async dailyStats(userId: string, month?: string) {
    const { from, to, month: label } = monthRange(month);
    const habits = await this.repo.findManyScoped(userId);
    const logs = await this.repo.findLogsInRangeForUser(userId, from, to);

    const checkedByHabit = new Map<string, Set<string>>();
    for (const log of logs) {
      const set = checkedByHabit.get(log.habitId) ?? new Set<string>();
      set.add(dateLabel(log.logDate));
      checkedByHabit.set(log.habitId, set);
    }

    return {
      month: label,
      days: daysInMonthList(label),
      habits: habits.map((h) => ({
        habitId: h.id,
        name: h.name,
        checkedDates: Array.from(checkedByHabit.get(h.id) ?? []).sort(),
      })),
    };
  }

  private async assertHabitExists(id: string, userId: string) {
    const habit = await this.repo.findByIdScoped(id, userId);
    if (!habit) {
      throw new NotFoundException('Habit not found');
    }
    return habit;
  }
}
