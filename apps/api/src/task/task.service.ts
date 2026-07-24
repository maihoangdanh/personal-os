import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma, TaskStatus } from '@personal-os/database';
import { AuditService } from '../audit/audit.service';
import { Paginated, PageMeta } from '../common/http/paginated';
import { CreateTaskDto } from './dto/create-task.dto';
import { QueryTaskDto } from './dto/query-task.dto';
import { TaskResponseDto } from './dto/task-response.dto';
import { TimeLogResponseDto } from './dto/timelog-response.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TaskRepository } from './task.repository';

/** Monday (UTC, ISO week) of the week containing `d`. */
function mondayOf(d: Date): Date {
  const day = d.getUTCDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1) - day; // days back to Monday
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
}

function dateLabel(d: Date): string {
  return d.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

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

@Injectable()
export class TaskService {
  constructor(
    private readonly repo: TaskRepository,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateTaskDto): Promise<TaskResponseDto> {
    const projectId = await this.resolveProjectId(userId, dto.projectId);
    if (dto.parentTaskId) {
      await this.assertTaskExists(dto.parentTaskId, userId);
    }
    const milestoneId = dto.milestoneId
      ? await this.resolveMilestoneId(userId, dto.milestoneId, projectId)
      : null;

    const status = dto.status ?? TaskStatus.TODO;
    const task = await this.repo.create({
      projectId,
      parentTaskId: dto.parentTaskId ?? null,
      milestoneId,
      title: dto.title,
      description: dto.description ?? null,
      impact: dto.impact,
      urgency: dto.urgency,
      priorityScore: dto.impact * dto.urgency, // Business Rule: Impact × Urgency
      estimateMinute: dto.estimateMinute ?? null,
      status,
      deadline: dto.deadline ? new Date(dto.deadline) : null,
      completedAt: status === TaskStatus.DONE ? new Date() : null,
    });

    await this.audit.record({
      userId,
      action: 'task.create',
      entityType: 'Task',
      entityId: task.id,
    });
    return TaskResponseDto.from(task);
  }

  async list(
    userId: string,
    query: QueryTaskDto,
  ): Promise<Paginated<TaskResponseDto[]>> {
    const { items, total } = await this.repo.findManyScoped(userId, {
      page: query.page,
      pageSize: query.pageSize,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder,
      keyword: query.keyword,
      status: query.status,
      projectId: query.projectId,
      dateFrom: query.dateFrom,
      dateTo: query.dateTo,
    });

    const meta: PageMeta = {
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize) || 0,
    };
    return new Paginated(items.map(TaskResponseDto.from), meta as unknown as Record<string, unknown>);
  }

  async get(userId: string, id: string): Promise<TaskResponseDto> {
    const task = await this.assertTaskExists(id, userId);
    return TaskResponseDto.from(task);
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateTaskDto,
  ): Promise<TaskResponseDto> {
    const existing = await this.assertTaskExists(id, userId);

    let finalProjectId = existing.projectId;
    if (dto.projectId) {
      const owned = await this.repo.findOwnedProjectId(dto.projectId, userId);
      if (!owned) {
        throw new NotFoundException('Project not found');
      }
      finalProjectId = owned;
    }
    if (dto.parentTaskId) {
      await this.assertTaskExists(dto.parentTaskId, userId);
    }

    // Resolve the milestone assignment (uuid = assign, null = unassign). If the
    // project moved and the caller didn't touch milestoneId, auto-unassign a
    // now cross-project milestone to keep the same-project invariant.
    let newMilestoneId: string | null | undefined;
    if (dto.milestoneId !== undefined) {
      newMilestoneId =
        dto.milestoneId === null
          ? null
          : await this.resolveMilestoneId(userId, dto.milestoneId, finalProjectId);
    } else if (dto.projectId && existing.milestoneId) {
      newMilestoneId = null;
    }

    // Enforce parent/child completion rule when transitioning to DONE via PATCH.
    if (dto.status === TaskStatus.DONE) {
      await this.assertSubtasksComplete(id);
    }

    const data: Prisma.TaskUncheckedUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.impact !== undefined) data.impact = dto.impact;
    if (dto.urgency !== undefined) data.urgency = dto.urgency;
    if (dto.estimateMinute !== undefined) data.estimateMinute = dto.estimateMinute;
    if (dto.status !== undefined) {
      data.status = dto.status;
      // Keep completedAt in sync with the DONE transition (Business Rule doc 02).
      if (dto.status === TaskStatus.DONE) {
        if (existing.status !== TaskStatus.DONE) data.completedAt = new Date();
      } else {
        data.completedAt = null;
      }
    }
    if (dto.projectId !== undefined) data.projectId = dto.projectId;
    if (dto.parentTaskId !== undefined) data.parentTaskId = dto.parentTaskId;
    if (newMilestoneId !== undefined) data.milestoneId = newMilestoneId;
    if (dto.deadline !== undefined) {
      data.deadline = dto.deadline ? new Date(dto.deadline) : null;
    }
    if (dto.impact !== undefined || dto.urgency !== undefined) {
      const impact = dto.impact ?? existing.impact;
      const urgency = dto.urgency ?? existing.urgency;
      data.priorityScore = impact * urgency;
    }

    const task = await this.repo.update(
      id,
      data,
      [existing.projectId],
      existing.milestoneId ? [existing.milestoneId] : [],
    );
    await this.audit.record({
      userId,
      action: 'task.update',
      entityType: 'Task',
      entityId: task.id,
      metadata: { fields: Object.keys(data) },
    });
    return TaskResponseDto.from(task);
  }

  async remove(userId: string, id: string): Promise<{ id: string; deleted: true }> {
    const existing = await this.assertTaskExists(id, userId);
    await this.repo.softDelete(id, existing.projectId, existing.milestoneId);
    await this.audit.record({
      userId,
      action: 'task.delete',
      entityType: 'Task',
      entityId: id,
    });
    return { id, deleted: true };
  }

  async complete(userId: string, id: string): Promise<TaskResponseDto> {
    const existing = await this.assertTaskExists(id, userId);
    await this.assertSubtasksComplete(id);

    // Business Rule doc 02: store completion time when a task moves to DONE.
    const task = await this.repo.update(
      id,
      { status: TaskStatus.DONE, completedAt: new Date() },
      [existing.projectId],
      existing.milestoneId ? [existing.milestoneId] : [],
    );
    await this.audit.record({
      userId,
      action: 'task.complete',
      entityType: 'Task',
      entityId: id,
    });
    return TaskResponseDto.from(task);
  }

  async startTimer(userId: string, id: string): Promise<TimeLogResponseDto> {
    await this.assertTaskExists(id, userId);
    const open = await this.repo.findOpenTimeLog(id);
    if (open) {
      throw new ConflictException('A timer is already running for this task');
    }
    const log = await this.repo.startTimer(id);
    await this.audit.record({
      userId,
      action: 'task.timer.start',
      entityType: 'Task',
      entityId: id,
    });
    return TimeLogResponseDto.from(log);
  }

  async stopTimer(userId: string, id: string): Promise<TimeLogResponseDto> {
    await this.assertTaskExists(id, userId);
    const open = await this.repo.findOpenTimeLog(id);
    if (!open) {
      throw new UnprocessableEntityException('No running timer for this task');
    }
    const endTime = new Date();
    const durationMinutes = Math.max(
      0,
      Math.round((endTime.getTime() - open.startTime.getTime()) / 60000),
    );
    const log = await this.repo.stopTimer(open.id, endTime, durationMinutes);
    await this.audit.record({
      userId,
      action: 'task.timer.stop',
      entityType: 'Task',
      entityId: id,
      metadata: { durationMinutes },
    });
    return TimeLogResponseDto.from(log);
  }

  /**
   * Dashboard StatStrip "Hoàn thành tuần". Upserts this week's snapshot on every
   * call (so history accumulates over time, same pattern as Net Worth trend —
   * see _workspace/29_backend_networth-trend.md) and compares against the exact
   * previous week's snapshot if one exists. No previous snapshot → changePercent
   * is null (never fabricated).
   */
  async weeklyStats(userId: string) {
    const now = new Date();
    const monday = mondayOf(now);
    const weekEnd = new Date(monday);
    weekEnd.setUTCDate(weekEnd.getUTCDate() + 6);
    weekEnd.setUTCHours(23, 59, 59, 999);
    const weekStartLabel = dateLabel(monday);

    const { completedCount, totalCount } = await this.repo.taskCountsInRange(
      userId,
      monday,
      weekEnd,
    );
    await this.repo.upsertWeeklyTaskStat(
      userId,
      weekStartLabel,
      completedCount,
      totalCount,
    );
    const completionPercent =
      totalCount > 0 ? round1((completedCount / totalCount) * 100) : 0;

    const prevMonday = new Date(monday);
    prevMonday.setUTCDate(prevMonday.getUTCDate() - 7);
    const prevLabel = dateLabel(prevMonday);
    const prevStat = await this.repo.findWeeklyTaskStat(userId, prevLabel);

    let previousWeek: { weekStart: string; completionPercent: number } | null = null;
    let changePercent: number | null = null;
    if (prevStat && prevStat.totalCount > 0) {
      const prevPercent = round1(
        (prevStat.completedCount / prevStat.totalCount) * 100,
      );
      previousWeek = { weekStart: prevStat.weekStart, completionPercent: prevPercent };
      changePercent = round1(completionPercent - prevPercent);
    }

    return {
      weekStart: weekStartLabel,
      completedCount,
      totalCount,
      completionPercent,
      previousWeek,
      changePercent,
    };
  }

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

  // ---- helpers ----

  private async resolveProjectId(
    userId: string,
    projectId?: string,
  ): Promise<string> {
    if (projectId) {
      const owned = await this.repo.findOwnedProjectId(projectId, userId);
      if (!owned) {
        throw new NotFoundException('Project not found');
      }
      return owned;
    }
    const inbox = await this.repo.findInboxProjectId(userId);
    if (!inbox) {
      throw new UnprocessableEntityException(
        'No default Inbox project for this user',
      );
    }
    return inbox;
  }

  /** Validates a milestone is owned by the user and belongs to `projectId`. */
  private async resolveMilestoneId(
    userId: string,
    milestoneId: string,
    projectId: string,
  ): Promise<string> {
    const milestone = await this.repo.findOwnedMilestone(milestoneId, userId);
    if (!milestone) {
      throw new NotFoundException('Milestone not found');
    }
    if (milestone.projectId !== projectId) {
      throw new UnprocessableEntityException(
        'Milestone must belong to the same project as the task',
      );
    }
    return milestone.id;
  }

  private async assertTaskExists(id: string, userId: string) {
    const task = await this.repo.findByIdScoped(id, userId);
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  /** Business Rule: a parent task completes only when all its subtasks are done. */
  private async assertSubtasksComplete(taskId: string): Promise<void> {
    const subtasks = await this.repo.findActiveSubtasks(taskId);
    const blocking = subtasks.filter((t) => t.status !== TaskStatus.DONE);
    if (blocking.length > 0) {
      throw new UnprocessableEntityException(
        'Cannot complete task while subtasks are not done',
      );
    }
  }
}
