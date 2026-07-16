import { Task, TaskStatus } from '@personal-os/database';

/** Exact shape returned for a Task. Copy this when building the frontend type. */
export class TaskResponseDto {
  id!: string;
  projectId!: string;
  parentTaskId!: string | null;
  title!: string;
  description!: string | null;
  impact!: number;
  urgency!: number;
  priorityScore!: number | null;
  estimateMinute!: number | null;
  status!: TaskStatus; // "INBOX" | "TODO" | "DOING" | "REVIEW" | "DONE" | "ARCHIVED"
  deadline!: string | null;
  completedAt!: string | null;
  createdAt!: string;
  updatedAt!: string;

  static from(task: Task): TaskResponseDto {
    return {
      id: task.id,
      projectId: task.projectId,
      parentTaskId: task.parentTaskId,
      title: task.title,
      description: task.description,
      impact: task.impact,
      urgency: task.urgency,
      priorityScore: task.priorityScore,
      estimateMinute: task.estimateMinute,
      status: task.status,
      deadline: task.deadline ? task.deadline.toISOString() : null,
      completedAt: task.completedAt ? task.completedAt.toISOString() : null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    };
  }
}
