import { Injectable } from '@nestjs/common';
import {
  prisma,
  Prisma,
  Task,
  TaskStatus,
  TimeLog,
} from '@personal-os/database';

/** Scopes any Task query to the owning user via Task -> Project -> Goal -> Vision. */
function ownedByUser(userId: string): Prisma.TaskWhereInput {
  return { project: { goal: { vision: { userId } } } };
}

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

  create(data: Prisma.TaskUncheckedCreateInput): Promise<Task> {
    return prisma.task.create({ data });
  }

  findByIdScoped(id: string, userId: string): Promise<Task | null> {
    return prisma.task.findFirst({
      where: { id, deletedAt: null, ...ownedByUser(userId) },
    });
  }

  async findManyScoped(
    userId: string,
    filter: TaskListFilter,
  ): Promise<{ items: Task[]; total: number }> {
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
      }),
      prisma.task.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.TaskUncheckedUpdateInput): Promise<Task> {
    return prisma.task.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Task> {
    return prisma.task.update({
      where: { id },
      data: { deletedAt: new Date() },
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
