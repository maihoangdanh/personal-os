"use client";

import * as React from "react";
import { AlarmClockOff, Bell, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useDeleteNotification,
  useMarkRead,
  useNotificationList,
} from "../hooks/useNotifications";
import type { AppNotification } from "../types/notification.types";
import { ReminderFormDialog } from "./ReminderFormDialog";
import { SnoozeDialog } from "./SnoozeDialog";

/** "Hôm nay" = nhắc hôm nay hoặc đã quá hạn; "Sắp tới" = tương lai. Nhóm client-side. */
function groupKey(n: AppNotification): "today" | "upcoming" {
  if (!n.scheduledFor) return "today";
  const d = new Date(n.scheduledFor);
  d.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d.getTime() <= today.getTime() ? "today" : "upcoming";
}

export function NotificationsView() {
  const [createOpen, setCreateOpen] = React.useState(false);
  const [snoozeTarget, setSnoozeTarget] = React.useState<AppNotification | null>(null);
  const { data, isLoading, isError, error } = useNotificationList({});

  const groups = React.useMemo(() => {
    const today: AppNotification[] = [];
    const upcoming: AppNotification[] = [];
    for (const n of data ?? []) {
      (groupKey(n) === "today" ? today : upcoming).push(n);
    }
    return [
      { label: "Hôm nay", items: today },
      { label: "Sắp tới", items: upcoming },
    ].filter((g) => g.items.length > 0);
  }, [data]);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Lời nhắc"
        title="Reminders"
        description="Theo dõi, đánh dấu đã đọc và snooze."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Tạo Reminder
          </Button>
        }
      />

      {isLoading && <NotificationsSkeleton />}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Không tải được danh sách reminder: {extractApiErrorMessage(error)}
        </div>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Chưa có reminder nào. Nhấn Tạo Reminder để thêm.
        </div>
      )}

      {!isLoading && !isError &&
        groups.map((group) => (
          <div key={group.label}>
            <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {group.label}
            </div>
            <div className="overflow-hidden rounded-[16px] border border-border bg-card shadow-sm">
              {group.items.map((n, idx) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  onSnooze={setSnoozeTarget}
                  last={idx === group.items.length - 1}
                />
              ))}
            </div>
          </div>
        ))}

      <ReminderFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SnoozeDialog
        open={!!snoozeTarget}
        onOpenChange={(open) => !open && setSnoozeTarget(null)}
        notification={snoozeTarget}
      />
    </div>
  );
}

function NotificationRow({
  notification,
  onSnooze,
  last,
}: {
  notification: AppNotification;
  onSnooze: (n: AppNotification) => void;
  last: boolean;
}) {
  const markReadMut = useMarkRead();
  const deleteMut = useDeleteNotification();
  const [error, setError] = React.useState<string | null>(null);
  const busy = markReadMut.isPending || deleteMut.isPending;

  async function run(fn: () => Promise<unknown>) {
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  const sub = notification.snoozedUntil
    ? `Snooze → ${formatDateTime(notification.snoozedUntil)}`
    : notification.message ||
      (notification.sentAt ? `Đã gửi: ${formatDateTime(notification.sentAt)}` : "Chưa tới hạn");

  return (
    <div
      className={cn(
        "flex items-center gap-3.5 px-5 py-[15px] transition-colors hover:bg-secondary",
        !last && "border-b border-border",
        notification.isRead && "opacity-70",
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 flex-none items-center justify-center rounded-[11px]",
          notification.isRead ? "bg-secondary text-muted-foreground" : "bg-warning/15 text-warning",
        )}
      >
        <Bell className="h-4 w-4" strokeWidth={1.8} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13.5px] font-medium">{notification.title}</div>
        <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">{sub}</div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
      </div>
      <div className="flex-none rounded-lg bg-secondary px-2.5 py-[5px] font-mono text-[12px]">
        {formatDateTime(notification.scheduledFor)}
      </div>
      <div className="flex flex-none items-center gap-1.5">
        {!notification.isRead && (
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => markReadMut.mutateAsync(notification.id))}
            className="rounded-lg border border-border px-[11px] py-[5px] text-[11.5px] font-semibold text-success transition-colors hover:bg-secondary"
          >
            Xong
          </button>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={() => onSnooze(notification)}
          className="flex items-center gap-1 rounded-lg border border-border px-[11px] py-[5px] text-[11.5px] font-semibold text-muted-foreground transition-colors hover:bg-secondary"
        >
          <AlarmClockOff className="h-3.5 w-3.5" /> Snooze
        </button>
        <Button
          variant="ghost"
          size="icon"
          title="Xoá"
          disabled={busy}
          onClick={() => run(() => deleteMut.mutateAsync(notification.id))}
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-16 animate-pulse rounded-[16px] bg-muted" aria-hidden />
      ))}
    </div>
  );
}
