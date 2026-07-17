import { Prisma, TaskStatus } from '@personal-os/database';

/**
 * Single source of truth for the two backend-maintained "computed" columns
 * (Project.progress, Milestone.isCompleted). All functions take a Prisma
 * TransactionClient so the caller controls atomicity — task mutations recompute
 * these inside the same $transaction (see 08/09 workspace docs, doc 02 rules).
 */

/** 2-decimal rounding helper (matches Decimal(5,2) on Project.progress). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Project.progress = % of DONE tasks among the project's active tasks, where
 * "active" excludes soft-deleted and ARCHIVED tasks (coordinator-confirmed).
 * Empty project => 0.
 */
export async function computeProjectProgress(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<{ progress: number; doneTasks: number; totalTasks: number }> {
  const totalTasks = await tx.task.count({
    where: { projectId, deletedAt: null, status: { not: TaskStatus.ARCHIVED } },
  });
  const doneTasks = await tx.task.count({
    where: { projectId, deletedAt: null, status: TaskStatus.DONE },
  });
  const progress = totalTasks === 0 ? 0 : round2((doneTasks / totalTasks) * 100);
  return { progress, doneTasks, totalTasks };
}

/** Compute Project.progress and persist it onto the project row. */
export async function persistProjectProgress(
  tx: Prisma.TransactionClient,
  projectId: string,
): Promise<number> {
  const { progress } = await computeProjectProgress(tx, projectId);
  await tx.project.update({ where: { id: projectId }, data: { progress } });
  return progress;
}

/**
 * Milestone.isCompleted = true when the milestone has at least one active task
 * and ALL its active (non-deleted) tasks are DONE (doc 02). Empty milestone =>
 * false. Persists the flag.
 */
export async function persistMilestoneCompletion(
  tx: Prisma.TransactionClient,
  milestoneId: string,
): Promise<boolean> {
  const totalTasks = await tx.task.count({
    where: { milestoneId, deletedAt: null },
  });
  const notDoneTasks = await tx.task.count({
    where: { milestoneId, deletedAt: null, status: { not: TaskStatus.DONE } },
  });
  const isCompleted = totalTasks > 0 && notDoneTasks === 0;
  await tx.milestone.update({
    where: { id: milestoneId },
    data: { isCompleted },
  });
  return isCompleted;
}
