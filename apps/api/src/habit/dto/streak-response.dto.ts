/**
 * GET /habits/{id}/streak
 *
 * Streak is computed on the fly from HabitLog rows (no stored streak column):
 * the number of consecutive calendar days with a check-in, ending today or —
 * if today has no check-in yet — yesterday. If the most recent check-in is
 * older than yesterday, the streak is considered broken (0).
 */
export class StreakResponseDto {
  habitId!: string;
  /** Consecutive-day count. 0 when there are no logs or the streak is broken. */
  currentStreak!: number;
  /** Most recent check-in date, "YYYY-MM-DD", or null when there are no logs. */
  lastLogDate!: string | null;
  /** True when the habit has already been checked in for today (server UTC day). */
  checkedInToday!: boolean;
}
