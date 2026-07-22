import { Injectable } from '@nestjs/common';
import { Goal, prisma, Prisma } from '@personal-os/database';

/** Scopes goals to the owning user via Goal -> Vision. */
function ownedByUser(userId: string): Prisma.GoalWhereInput {
  return { vision: { userId } };
}

export interface GoalListFilter {
  page: number;
  pageSize: number;
  sortOrder: 'asc' | 'desc';
  visionId?: string;
  status?: Prisma.GoalWhereInput['status'];
}

/** Only place that touches prisma for the goal domain. Filters deletedAt: null. */
@Injectable()
export class GoalRepository {
  /** True if the vision exists and belongs to the user. */
  async isVisionOwned(visionId: string, userId: string): Promise<boolean> {
    const v = await prisma.vision.findFirst({
      where: { id: visionId, userId, deletedAt: null },
      select: { id: true },
    });
    return v !== null;
  }

  create(data: Prisma.GoalUncheckedCreateInput): Promise<Goal> {
    return prisma.goal.create({ data });
  }

  findByIdScoped(id: string, userId: string): Promise<Goal | null> {
    return prisma.goal.findFirst({
      where: { id, deletedAt: null, ...ownedByUser(userId) },
    });
  }

  async findManyScoped(
    userId: string,
    filter: GoalListFilter,
  ): Promise<{ items: Goal[]; total: number }> {
    const where: Prisma.GoalWhereInput = {
      deletedAt: null,
      ...ownedByUser(userId),
    };
    if (filter.visionId) where.visionId = filter.visionId;
    if (filter.status) where.status = filter.status;

    const [items, total] = await Promise.all([
      prisma.goal.findMany({
        where,
        orderBy: { createdAt: filter.sortOrder },
        skip: (filter.page - 1) * filter.pageSize,
        take: filter.pageSize,
      }),
      prisma.goal.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.GoalUncheckedUpdateInput): Promise<Goal> {
    return prisma.goal.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Goal> {
    return prisma.goal.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  countActiveProjects(goalId: string): Promise<number> {
    return prisma.project.count({ where: { goalId, deletedAt: null } });
  }

  /**
   * Average Project.progress per goal, in one query (avoids N+1 across a list).
   * Returns a map with an entry for every requested goalId — 0 when the goal
   * has no (non-deleted) projects.
   */
  async getProjectAvgProgressByGoalIds(
    goalIds: string[],
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (goalIds.length === 0) return result;

    const rows = await prisma.project.groupBy({
      by: ['goalId'],
      where: { goalId: { in: goalIds }, deletedAt: null },
      _avg: { progress: true },
    });
    for (const row of rows) {
      result.set(row.goalId, row._avg.progress?.toNumber() ?? 0);
    }
    for (const id of goalIds) {
      if (!result.has(id)) result.set(id, 0);
    }
    return result;
  }
}
