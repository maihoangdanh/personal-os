/**
 * Notification (Reminder) types — copy CHÍNH XÁC từ
 * _workspace/phase1_backend_habit-reminder-calendar.md (mục 2).
 *
 * Lưu ý ranh giới:
 * - List `/notifications` trả MẢNG THUẦN trong `data` (KHÔNG phân trang).
 * - `unread-count` trả object `{ count: number }`.
 * - Mọi field datetime là ISO-8601 string hoặc null.
 * - Snooze chỉ cần gửi `snoozedUntil`; backend tự re-arm (scheduledFor = snoozedUntil,
 *   sentAt = null, isRead = false). KHÔNG có endpoint PATCH sửa title/message.
 */

export const NOTIFICATION_TYPES = [
  "REMINDER",
  "DEADLINE",
  "SYSTEM",
  "ACHIEVEMENT",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

/** NotificationResponseDto — GET list (mảng), POST, GET :id, PATCH read, PATCH snooze */
export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string | null;
  isRead: boolean;
  readAt: string | null; // ISO-8601
  scheduledFor: string | null; // ISO-8601 — khi nào reminder kêu
  sentAt: string | null; // ISO-8601 — cron set khi đã "gửi"
  snoozedUntil: string | null; // ISO-8601
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

/** UnreadCountResponseDto — GET /notifications/unread-count */
export interface UnreadCount {
  count: number;
}

/** DELETE /notifications/:id response data */
export interface NotificationDeleteResult {
  id: string;
  deleted: true;
}

// --- Request payloads ---

/** CreateNotificationDto */
export interface CreateNotificationPayload {
  title: string; // 1..255
  message?: string;
  type?: NotificationType; // default "REMINDER"
  scheduledFor?: string; // ISO-8601
  relatedEntityType?: string; // max 50
  relatedEntityId?: string; // uuid
}

/** SnoozeNotificationDto */
export interface SnoozePayload {
  snoozedUntil: string; // ISO-8601 (nên là tương lai)
}

/** Query GET /notifications (tất cả optional) */
export interface NotificationQuery {
  isRead?: boolean;
  type?: NotificationType;
}
