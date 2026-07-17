import { Injectable } from '@nestjs/common';
import { prisma, Prisma, Project, TaskStatus } from '@personal-os/database';
import { computeProjectProgress } from '../common/rollup';

/** Scopes projects to the owning user via Project -> Goal -> Vision. */
function ownedByUser(userId: string): Prisma.ProjectWhereInput {
  return { goal: { vision: { userId } } };
}

export interface ProjectListFilter {
  page: number;
  pageSize: number;
  sortOrder: 'asc' | 'desc';
  goalId?: string;
  status?: Prisma.ProjectWhereInput['status'];
}

/** Only place that touches prisma for the project domain. Filters deletedAt: null. */
@Injectable()
export class ProjectRepository {
  async isGoalOwned(goalId: string, userId: string): Promise<boolean> {
    const g = await prisma.goal.findFirst({
      where: { id: goalId, deletedAt: null, vision: { userId } },
      select: { id: true },
    });
    return g !== null;
  }

  create(data: Prisma.ProjectUncheckedCreateInput): Promise<Project> {
    return prisma.project.create({ data });
  }

  findByIdScoped(id: string, userId: string): Promise<Project | null> {
    return prisma.project.findFirst({
      where: { id, deletedAt: null, ...ownedByUser(userId) },
    });
  }

  async findManyScoped(
    userId: string,
    filter: ProjectListFilter,
  ): Promise<{ items: Project[]; total: number }> {
    const where: Prisma.ProjectWhereInput = {
      deletedAt: null,
      ...ownedByUser(userId),
    };
    if (filter.goalId) where.goalId = filter.goalId;
    if (filter.status) where.status = filter.status;

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        orderBy: { createdAt: filter.sortOrder },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.project.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.ProjectUncheckedUpdateInput): Promise<Project> {
    return prisma.project.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Project> {
    return prisma.project.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Active DOING tasks in the project — blocks closing the project. */
  countDoingTasks(projectId: string): Promise<number> {
    return prisma.task.count({
      where: { projectId, deletedAt: null, status: TaskStatus.DOING },
    });
  }

  countActiveTasks(projectId: string): Promise<number> {
    return prisma.task.count({ where: { projectId, deletedAt: null } });
  }

  /** Read-only progress breakdown (shared formula in common/rollup). */
  computeProgress(projectId: string) {
    return computeProjectProgress(prisma, projectId);
  }
}
