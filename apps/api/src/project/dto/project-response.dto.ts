import { Project, ProjectStatus } from '@personal-os/database';

/** Exact shape returned for a Project. */
export class ProjectResponseDto {
  id!: string;
  goalId!: string;
  title!: string;
  status!: ProjectStatus; // PLANNING | ACTIVE | ON_HOLD | COMPLETED | CANCELLED
  progress!: number; // backend-maintained % of DONE tasks (0..100)
  createdAt!: string;
  updatedAt!: string;

  static from(p: Project): ProjectResponseDto {
    return {
      id: p.id,
      goalId: p.goalId,
      title: p.title,
      status: p.status,
      progress: p.progress.toNumber(),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
