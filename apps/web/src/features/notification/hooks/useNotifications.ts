"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService } from "../services/notification.service";
import type {
  CreateNotificationPayload,
  NotificationQuery,
  SnoozePayload,
} from "../types/notification.types";

export const notificationKeys = {
  all: ["notifications"] as const,
  list: (query: NotificationQuery) => ["notifications", "list", query] as const,
  unreadCount: () => ["notifications", "unread-count"] as const,
};

export function useNotificationList(query: NotificationQuery = {}) {
  return useQuery({
    queryKey: notificationKeys.list(query),
    queryFn: () => notificationService.list(query),
    staleTime: 15_000,
  });
}

/** Badge sidebar — poll mỗi 60s để nhặt reminder mới do cron xử lý. */
export function useUnreadCount() {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () => notificationService.unreadCount(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

function useInvalidateNotifications() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: notificationKeys.all });
}

export function useCreateNotification() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (payload: CreateNotificationPayload) =>
      notificationService.create(payload),
    onSuccess: invalidate,
  });
}

export function useDeleteNotification() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: string) => notificationService.remove(id),
    onSuccess: invalidate,
  });
}

export function useMarkRead() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: (id: string) => notificationService.markRead(id),
    onSuccess: invalidate,
  });
}

export function useSnooze() {
  const invalidate = useInvalidateNotifications();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: SnoozePayload }) =>
      notificationService.snooze(id, payload),
    onSuccess: invalidate,
  });
}
