import { Task, TaskStatus } from '@personal-os/database';

/** Task enriched with its TimeLogs (minimal fields) for the timer + spent fields. */
type TaskWithTimer = Task & {
  timeLogs?: { id: string; endTime: Date | null; durationMinutes: number | null }[];
};

/** Exact shape returned for a Task. Copy this when building the frontend type. */
export class TaskResponseDto {
  id!: string;
  projectId!: string;
  parentTaskId!: string | null;
  milestoneId!: string | null;
  recurringTemplateId!: string | null;
  title!: string;
  description!: string | null;
  impact!: number;
  urgency!: number;
  priorityScore!: number | null;
  estimateMinute!: number | null;
  status!: TaskStatus; // "INBOX" | "TODO" | "DOING" | "REVIEW" | "DONE" | "ARCHIVED"
  deadline!: string | null;
  completedAt!: string | null;
  /** True when the task has a running TimeLog (endTime null). */
  isTimerRunning!: boolean;
  /** Id of the running TimeLog, or null. Use it to call /timer/stop. */
  activeTimeLogId!: string | null;
  /** Σ durationMinutes of stopped TimeLogs (running leg excluded); 0 when none. */
  spentMinute!: number;
  createdAt!: string;
  updatedAt!: string;

  static from(task: TaskWithTimer): TaskResponseDto {
    const logs = task.timeLogs ?? [];
    const activeTimeLog = logs.find((l) => l.endTime === null) ?? null;
    const spentMinute = logs.reduce(
      (sum, l) => sum + (l.durationMinutes ?? 0),
      0,
    );
    return {
      id: task.id,
      projectId: task.projectId,
      parentTaskId: task.parentTaskId,
      milestoneId: task.milestoneId,
      recurringTemplateId: task.recurringTemplateId,
      title: task.title,
      description: task.description,
      impact: task.impact,
      urgency: task.urgency,
      priorityScore: task.priorityScore,
      estimateMinute: task.estimateMinute,
      status: task.status,
      deadline: task.deadline ? task.deadline.toISOString() : null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      isTimerRunning: activeTimeLog !== null,
      activeTimeLogId: activeTimeLog?.id ?? null,
      spentMinute,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}
