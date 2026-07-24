/**
 * Habit types — copy CHÍNH XÁC từ _workspace/phase1_backend_habit-reminder-calendar.md (mục 1).
 *
 * Lưu ý ranh giới:
 * - List `/habits` trả MẢNG THUẦN trong `data` (KHÔNG phân trang, khác `tasks`).
 * - `createdAt`/`updatedAt` là ISO-8601 string.
 * - `HabitLog.logDate` và `Streak.lastLogDate` là DATE-only "YYYY-MM-DD" (KHÔNG có time).
 * - Check-in trùng ngày → 409 Conflict, message "Habit already checked in for today".
 */

/** HabitResponseDto — GET list (mảng), POST, GET :id, PATCH */
export interface Habit {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  frequency: string; // "DAILY" | "WEEKLY" | ... (free string)
  targetPerPeriod: number;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

/** HabitLogResponseDto — trả bởi POST /habits/:id/checkin */
export interface HabitLog {
  id: string;
  habitId: string;
  logDate: string; // "YYYY-MM-DD" DATE-only
  value: number;
  note: string | null;
  createdAt: string; // ISO-8601 datetime
}

/** StreakResponseDto — trả bởi GET /habits/:id/streak */
export interface HabitStreak {
  habitId: string;
  currentStreak: number; // 0 nếu chưa có log hoặc đứt
  lastLogDate: string | null; // "YYYY-MM-DD" | null
  checkedInToday: boolean; // dùng để disable nút check-in
}

/** DELETE /habits/:id response data */
export interface HabitDeleteResult {
  id: string;
  deleted: true;
}

// --- Request payloads ---

/** CreateHabitDto */
export interface CreateHabitPayload {
  name: string; // 1..255
  description?: string;
  frequency?: string; // max 20, default "DAILY"
  targetPerPeriod?: number; // int 1..1000, default 1
}

/** UpdateHabitDto — mọi field optional */
export type UpdateHabitPayload = Partial<CreateHabitPayload>;

/** CheckinHabitDto — body optional */
export interface CheckinHabitPayload {
  value?: number; // int 1..1000, default 1
  note?: string; // max 2000
}

/** Gợi ý frequency cho form (backend nhận free string). */
export const HABIT_FREQUENCIES = ["DAILY", "WEEKLY"] as const;

/** GET /habits/monthly-stats response data — trang Analytics. */
export interface MonthlyHabitStats {
  month: string; // "YYYY-MM"
  checkinCount: number;
  previousMonth: { month: string; checkinCount: number } | null;
  changePercent: number | null; // % thay đổi TƯƠNG ĐỐI của số lượng check-in
  habitCount: number;
  longestCurrentStreak: { habitName: string; currentStreak: number } | null;
}

/** GET /habits/monthly-stats/daily response data — Analytics heatmap. */
export interface DailyHabitStats {
  month: string;
  days: string[];
  habits: Array<{ habitId: string; name: string; checkedDates: string[] }>;
}
