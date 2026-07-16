import { apiClient, type ApiEnvelope } from "@/lib/api-client";
import type {
  AppNotification,
  CreateNotificationPayload,
  NotificationDeleteResult,
  NotificationQuery,
  SnoozePayload,
  UnreadCount,
} from "../types/notification.types";

/** Lớp DUY NHẤT gọi API notification. Unwrap envelope; list trả mảng thuần trong `data`. */
export const notificationService = {
  async list(query: NotificationQuery = {}): Promise<AppNotification[]> {
    const res = await apiClient.get<ApiEnvelope<AppNotification[]>>(
      "/notifications",
      { params: cleanParams(query) },
    );
    return res.data.data;
  },

  async unreadCount(): Promise<number> {
    const res = await apiClient.get<ApiEnvelope<UnreadCount>>(
      "/notifications/unread-count",
    );
    return res.data.data.count;
  },

  async get(id: string): Promise<AppNotification> {
    const res = await apiClient.get<ApiEnvelope<AppNotification>>(
      `/notifications/${id}`,
    );
    return res.data.data;
  },

  async create(payload: CreateNotificationPayload): Promise<AppNotification> {
    const res = await apiClient.post<ApiEnvelope<AppNotification>>(
      "/notifications",
      payload,
    );
    return res.data.data;
  },

  async remove(id: string): Promise<NotificationDeleteResult> {
    const res = await apiClient.delete<ApiEnvelope<NotificationDeleteResult>>(
      `/notifications/${id}`,
    );
    return res.data.data;
  },

  async markRead(id: string): Promise<AppNotification> {
    const res = await apiClient.patch<ApiEnvelope<AppNotification>>(
      `/notifications/${id}/read`,
    );
    return res.data.data;
  },

  async snooze(id: string, payload: SnoozePayload): Promise<AppNotification> {
    const res = await apiClient.patch<ApiEnvelope<AppNotification>>(
      `/notifications/${id}/snooze`,
      payload,
    );
    return res.data.data;
  },
};

/** Loại bỏ field rỗng khỏi query. Giữ nguyên boolean false (isRead=false hợp lệ). */
function cleanParams(query: NotificationQuery): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    out[k] = v;
  }
  return out;
}
