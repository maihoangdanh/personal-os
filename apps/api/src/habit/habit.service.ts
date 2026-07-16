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

  private async assertHabitExists(id: string, userId: string) {
    const habit = await this.repo.findByIdScoped(id, userId);
    if (!habit) {
      throw new NotFoundException('Habit not found');
    }
    return habit;
  }
}
