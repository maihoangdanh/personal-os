import { HabitLog } from '@personal-os/database';

/**
 * Exact shape returned for a HabitLog (a single check-in).
 *
 * `logDate` is a DATE-only field, returned as a "YYYY-MM-DD" string (NOT a full
 * datetime) so the frontend never has to worry about timezone shifting the day.
 */
export class HabitLogResponseDto {
  id!: string;
  habitId!: string;
  logDate!: string; // "YYYY-MM-DD"
  value!: number;
  note!: string | null;
  createdAt!: string; // ISO-8601 datetime

  static from(log: HabitLog): HabitLogResponseDto {
    return {
      id: log.id,
      habitId: log.habitId,
      logDate: log.logDate.toISOString().slice(0, 10),
      value: log.value,
      note: log.note,
      createdAt: log.createdAt.toISOString(),
    };
  }
}
