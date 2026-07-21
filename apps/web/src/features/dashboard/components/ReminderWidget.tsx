"use client";

import { Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardLink } from "@/components/layout/CardLink";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useNotificationList } from "@/features/notification/hooks/useNotifications";

/** "HH:mm" nếu hôm nay, ngược lại "DD/MM". */
function fmtReminderTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? `${pad(d.getHours())}:${pad(d.getMinutes())}`
    : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

/**
 * Reminder widget — vài nhắc nhở chưa đọc gần nhất theo scheduledFor.
 * Tái dùng useNotificationList (feature notification) — KHÔNG tạo API call trùng lặp.
 */
export function ReminderWidget() {
  const { data, isLoading, isError, error } = useNotificationList({ isRead: false });

  const items = (data ?? [])
    .filter((n) => n.scheduledFor)
    .sort(
      (a, b) =>
        new Date(a.scheduledFor as string).getTime() -
        new Date(b.scheduledFor as string).getTime(),
    )
    .slice(0, 4);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-warning" /> Nhắc nhở
        </CardTitle>
        <CardLink href="/reminders">Xem tất cả →</CardLink>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-8 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        )}

        {isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Không tải được nhắc nhở: {extractApiErrorMessage(error)}
          </p>
        )}

        {!isLoading && !isError && items.length === 0 && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Không có nhắc nhở nào sắp tới.
          </p>
        )}

        {!isLoading && !isError && items.length > 0 && (
          <ul className="flex flex-col gap-[11px]">
            {items.map((n) => (
              <li key={n.id} className="flex items-center gap-[11px]">
                <Bell className="h-3.5 w-3.5 shrink-0 text-warning" />
                <span className="min-w-0 flex-1 truncate text-[13px]">{n.title}</span>
                <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
                  {fmtReminderTime(n.scheduledFor as string)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
