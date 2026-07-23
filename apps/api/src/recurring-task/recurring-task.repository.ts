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
