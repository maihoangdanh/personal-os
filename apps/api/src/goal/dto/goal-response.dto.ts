import { Goal, GoalStatus, Prisma } from '@personal-os/database';

function toNum(d: Prisma.Decimal | null): number | null {
  return d === null ? null : d.toNumber();
}

/**
 * Hybrid progress:
 * - KPI goal (targetValue != null): unchanged, min(100, current/target*100).
 * - Non-KPI goal (targetValue === null): average progress of child projects
 *   when provided; 0 otherwise.
 */
export function computeGoalProgress(
  currentValue: Prisma.Decimal,
  targetValue: Prisma.Decimal | null,
  projectAvgProgress?: number,
): number {
  if (targetValue === null) {
    if (projectAvgProgress === undefined) return 0;
    return Math.min(100, Math.round(projectAvgProgress * 100) / 100);
  }
  const target = targetValue.toNumber();
  if (target <= 0) return 0;
  const pct = (currentValue.toNumber() / target) * 100;
  return Math.min(100, Math.round(pct * 100) / 100);
}

/** Exact shape returned for a Goal. */
export class GoalResponseDto {
  id!: string;
  visionId!: string;
  title!: string;
  targetValue!: number | null;
  currentValue!: number;
  progress!: number; // computed, capped at 100
  deadline!: string | null; // YYYY-MM-DD
  status!: GoalStatus; // "ACTIVE" | "ACHIEVED" | "MISSED" | "ARCHIVED"
  createdAt!: string;
  updatedAt!: string;

  static from(g: Goal, projectAvgProgress?: number): GoalResponseDto {
    return {
      id: g.id,
      visionId: g.visionId,
      title: g.title,
      targetValue: toNum(g.targetValue),
      currentValue: g.currentValue.toNumber(),
      progress: computeGoalProgress(g.currentValue, g.targetValue, projectAvgProgress),
      deadline: g.deadline ? g.deadline.toISOString().slice(0, 10) : null,
      status: g.status,
      createdAt: g.createdAt.toISOString(),
      updatedAt: g.updatedAt.toISOString(),
    };
  }
}
