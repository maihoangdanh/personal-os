import { Milestone } from '@personal-os/database';

/** Exact shape returned for a Milestone. */
export class MilestoneResponseDto {
  id!: string;
  projectId!: string;
  title!: string;
  dueDate!: string | null;
  isCompleted!: boolean; // backend-maintained: true when all its active tasks are DONE
  createdAt!: string;
  updatedAt!: string;

  static from(m: Milestone): MilestoneResponseDto {
    return {
      id: m.id,
      projectId: m.projectId,
      title: m.title,
      dueDate: m.dueDate ? m.dueDate.toISOString() : null,
      isCompleted: m.isCompleted,
      createdAt: m.createdAt.toISOString(),
      updatedAt: m.updatedAt.toISOString(),
    };
  }
}
