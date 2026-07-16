import { TimeLog } from '@personal-os/database';

/** Returned by /tasks/{id}/timer/start and /tasks/{id}/timer/stop. */
export class TimeLogResponseDto {
  id!: string;
  taskId!: string;
  startTime!: string;
  endTime!: string | null;
  durationMinutes!: number | null;

  static from(log: TimeLog): TimeLogResponseDto {
    return {
      id: log.id,
      taskId: log.taskId,
      startTime: log.startTime.toISOString(),
      endTime: log.endTime ? log.endTime.toISOString() : null,
      durationMinutes: log.durationMinutes,
    };
  }
}
