/**
 * Calendar types — copy CHÍNH XÁC từ
 * _workspace/phase1_backend_habit-reminder-calendar.md (mục 3).
 *
 * Lưu ý ranh giới:
 * - List `/calendar-events` trả MẢNG THUẦN trong `data` (sort startTime tăng dần).
 * - Query filter `from`/`to` là ISO-8601, lọc theo `startTime`.
 * - `endTime` optional; nếu có PHẢI sau startTime (vi phạm → 422). PATCH gửi `endTime: null` để clear.
 */

/** CalendarEventResponseDto — GET list (mảng), POST, GET :id, PATCH */
export interface CalendarEvent {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  startTime: string; // ISO-8601
  endTime: string | null; // ISO-8601
  location: string | null;
  allDay: boolean;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

/** DELETE /calendar-events/:id response data */
export interface CalendarEventDeleteResult {
  id: string;
  deleted: true;
}

// --- Request payloads ---

/** CreateCalendarEventDto */
export interface CreateCalendarEventPayload {
  title: string; // 1..255
  description?: string;
  startTime: string; // ISO-8601 (bắt buộc)
  endTime?: string; // ISO-8601 — nếu có phải sau startTime
  location?: string; // max 255
  allDay?: boolean; // default false
}

/**
 * UpdateCalendarEventDto — mọi field optional.
 * Gửi `endTime: null` để xoá endTime (open-ended).
 */
export interface UpdateCalendarEventPayload {
  title?: string;
  description?: string;
  startTime?: string;
  endTime?: string | null;
  location?: string;
  allDay?: boolean;
}

/** Query GET /calendar-events (tất cả optional) */
export interface CalendarEventQuery {
  from?: string; // ISO-8601 — startTime >= from
  to?: string; // ISO-8601 — startTime <= to
}
