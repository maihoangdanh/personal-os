import { Injectable } from '@nestjs/common';
import {
  prisma,
  Prisma,
  Task,
  TaskStatus,
  TimeLog,
} from '@personal-os/database';
import {
  persistMilestoneCompletion,
  persistProjectProgress,
} from '../common/rollup';

/** Scopes any Task query to the owning user via Task -> Project -> Goal -> Vision. */
function ownedByUser(userId: string): Prisma.TaskWhereInput {
  return { project: { goal: { vision: { userId } } } };
}

/**
 * Include the task's TimeLogs (minimal fields) so responses can expose, in one
 * query: isTimerRunning + activeTimeLogId (the open leg, endTime null) and
 * spentMinute (Σ durationMinutes of stopped legs — derived at runtime, no column).
 */
const withTimeLogs = {
  timeLogs: {
    where: { deletedAt: null },
    select: { id: true, endTime: true, durationMinutes: true },
    orderBy: { startTime: 'desc' },
  },
} satisfies Prisma.TaskInclude;

export type TaskWithTimer = Prisma.TaskGetPayload<{
  include: typeof withTimeLogs;
}>;

export interface TaskListFilter {
  page: number;
  pageSize: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  keyword?: string;
  status?: TaskStatus;
  projectId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/** Only place that touches prisma for the task domain. Always filters deletedAt: null. */
@Injectable()
export class TaskRepository {
  /** The default "Inbox" project provisioned at registration. */
  async findInboxProjectId(userId: string): Promise<string | null> {
    const project = await prisma.project.findFirst({
      where: { title: 'Inbox', deletedAt: null, goal: { vision: { userId } } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });
    return project?.id ?? null;
  }

  /** Returns the projectId if it belongs to the user, else null. */
  async findOwnedProjectId(
    projectId: string,
    userId: string,
  ): Promise<string | null> {
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null, goal: { vision: { userId } } },
      select: { id: true },
    });
    return project?.id ?? null;
  }

  /** Returns {id, projectId} if the milestone belongs to the user, else null. */
  findOwnedMilestone(
    milestoneId: string,
    userId: string,
  ): Promise<{ id: string; projectId: string } | null> {
    return prisma.milestone.findFirst({
      where: {
        id: milestoneId,
        deletedAt: null,
        project: { goal: { vision: { userId } } },
      },
      select: { id: true, projectId: true },
    });
  }

  /**
   * Create + recompute the owning Project.progress (and Milestone.isCompleted if
   * assigned) in one transaction. See common/rollup.
   */
  create(data: Prisma.TaskUncheckedCreateInput): Promise<TaskWithTimer> {
    return prisma.$transaction(async (tx) => {
      const task = await tx.task.create({ data, include: withTimeLogs });
      await persistProjectProgress(tx, task.projectId);
      if (task.milestoneId) {
        await persistMilestoneCompletion(tx, task.milestoneId);
      }
      return task;
    });
  }

  findByIdScoped(id: string, userId: string): Promise<TaskWithTimer | null> {
    return prisma.task.findFirst({
      where: { id, deletedAt: null, ...ownedByUser(userId) },
      include: withTimeLogs,
    });
  }

  async findManyScoped(
    userId: string,
    filter: TaskListFilter,
  ): Promise<{ items: TaskWithTimer[]; total: number }> {
    const where: Prisma.TaskWhereInput = {
      deletedAt: null,
      ...ownedByUser(userId),
    };
    if (filter.status) {
      where.status = filter.status;
    }
    if (filter.projectId) {
      where.projectId = filter.projectId;
    }
    if (filter.keyword) {
      where.OR = [
        { title: { contains: filter.keyword, mode: 'insensitive' } },
        { description: { contains: filter.keyword, mode: 'insensitive' } },
      ];
    }
    if (filter.dateFrom || filter.dateTo) {
      where.deadline = {
        ...(filter.dateFrom ? { gte: new Date(filter.dateFrom) } : {}),
        ...(filter.dateTo ? { lte: new Date(filter.dateTo) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: { [filter.sortBy]: filter.sortOrder },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
        include: withTimeLogs,
      }),
      prisma.task.count({ where }),
    ]);
    return { items, total };
  }

  /**
   * Update + recompute rollups in one transaction. `affectedProjectIds` /
   * `affectedMilestoneIds` carry the task's PREVIOUS project/milestone so a moved
   * task refreshes both the old and new parents. The task's current project (and
   * milestone, if any) are always included.
   */
  update(
    id: string,
    data: Prisma.TaskUncheckedUpdateInput,
    affectedProjectIds: string[] = [],
    affectedMilestoneIds: string[] = [],
  ): Promise<TaskWithTimer> {
    return prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id },
        data,
        include: withTimeLogs,
      });
      const projectIds = new Set<string>([task.projectId, ...affectedProjectIds]);
      const milestoneIds = new Set<string>([
        ...(task.milestoneId ? [task.milestoneId] : []),
        ...affectedMilestoneIds,
      ]);
      for (const pid of projectIds) await persistProjectProgress(tx, pid);
      for (const mid of milestoneIds) await persistMilestoneCompletion(tx, mid);
      return task;
    });
  }

  /** Soft-delete + recompute the parent project/milestone rollups in one transaction. */
  softDelete(
    id: string,
    projectId: string,
    milestoneId: string | null,
  ): Promise<Task> {
    return prisma.$transaction(async (tx) => {
      const task = await tx.task.update({
        where: { id },
        data: { deletedAt: new Date() },
      });
      await persistProjectProgress(tx, projectId);
      if (milestoneId) await persistMilestoneCompletion(tx, milestoneId);
      return task;
    });
  }

  /** Active subtasks used to enforce "parent completes only when all children done". */
  findActiveSubtasks(parentTaskId: string): Promise<Task[]> {
    return prisma.task.findMany({
      where: { parentTaskId, deletedAt: null },
    });
  }

  // ---- Timer (TimeLog) ----

  findOpenTimeLog(taskId: string): Promise<TimeLog | null> {
    return prisma.timeLog.findFirst({
      where: { taskId, endTime: null, deletedAt: null },
      orderBy: { startTime: 'desc' },
    });
  }

  startTimer(taskId: string): Promise<TimeLog> {
    return prisma.timeLog.create({
      data: { taskId, startTime: new Date() },
    });
  }

  stopTimer(id: string, endTime: Date, durationMinutes: number): Promise<TimeLog> {
    return prisma.timeLog.update({
      where: { id },
      data: { endTime, durationMinutes },
    });
  }
}
