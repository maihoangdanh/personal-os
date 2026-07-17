import { Injectable } from '@nestjs/common';
import { Milestone, prisma, Prisma } from '@personal-os/database';

/** Scopes milestones to the owning user via Milestone -> Project -> Goal -> Vision. */
function ownedByUser(userId: string): Prisma.MilestoneWhereInput {
  return { project: { goal: { vision: { userId } } } };
}

/** Only place that touches prisma for the milestone domain. Filters deletedAt: null. */
@Injectable()
export class MilestoneRepository {
  async isProjectOwned(projectId: string, userId: string): Promise<boolean> {
    const p = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null, goal: { vision: { userId } } },
      select: { id: true },
    });
    return p !== null;
  }

  create(data: Prisma.MilestoneUncheckedCreateInput): Promise<Milestone> {
    return prisma.milestone.create({ data });
  }

  findByIdScoped(id: string, userId: string): Promise<Milestone | null> {
    return prisma.milestone.findFirst({
      where: { id, deletedAt: null, ...ownedByUser(userId) },
    });
  }

  async findManyScoped(
    userId: string,
    page: number,
    pageSize: number,
    sortOrder: 'asc' | 'desc',
    projectId?: string,
  ): Promise<{ items: Milestone[]; total: number }> {
    const where: Prisma.MilestoneWhereInput = {
      deletedAt: null,
      ...ownedByUser(userId),
    };
    if (projectId) where.projectId = projectId;

    const [items, total] = await Promise.all([
      prisma.milestone.findMany({
        where,
        orderBy: { createdAt: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.milestone.count({ where }),
    ]);
    return { items, total };
  }

  update(id: string, data: Prisma.MilestoneUncheckedUpdateInput): Promise<Milestone> {
    return prisma.milestone.update({ where: { id }, data });
  }

  softDelete(id: string): Promise<Milestone> {
    return prisma.milestone.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  countActiveTasks(milestoneId: string): Promise<number> {
    return prisma.task.count({ where: { milestoneId, deletedAt: null } });
  }
}
