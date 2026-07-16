"use client";

import * as React from "react";
import { AlarmClockOff, Check, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useDeleteNotification,
  useMarkRead,
  useNotificationList,
} from "../hooks/useNotifications";
import type {
  AppNotification,
  NotificationQuery,
} from "../types/notification.types";
import { ReminderFormDialog } from "./ReminderFormDialog";
import { SnoozeDialog } from "./SnoozeDialog";

type ReadFilter = "ALL" | "UNREAD";

export function NotificationsView() {
  const [readFilter, setReadFilter] = React.useState<ReadFilter>("ALL");
  const [createOpen, setCreateOpen] = React.useState(false);
  const [snoozeTarget, setSnoozeTarget] = React.useState<AppNotification | null>(null);

  const query: NotificationQuery =
    readFilter === "UNREAD" ? { isRead: false } : {};
  const { data, isLoading, isError, error } = useNotificationList(query);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <Button
            variant={readFilter === "ALL" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setReadFilter("ALL")}
          >
            Tất cả
          </Button>
          <Button
            variant={readFilter === "UNREAD" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setReadFilter("UNREAD")}
          >
            Chưa đọc
          </Button>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Tạo Reminder
        </Button>
      </div>

      {isLoading && <NotificationsSkeleton />}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Không tải được danh sách reminder: {extractApiErrorMessage(error)}
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          {data.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              {readFilter === "UNREAD"
                ? "Không có reminder chưa đọc."
                : "Chưa có reminder nào. Nhấn Tạo Reminder để thêm."}
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((n) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  onSnooze={setSnoozeTarget}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ReminderFormDialog open={createOpen} onOpenChange={setCreateOpen} />
      <SnoozeDialog
        open={!!snoozeTarget}
        onOpenChange={(open) => !open && setSnoozeTarget(null)}
        notification={snoozeTarget}
      />
    </div>
  );
}

function NotificationCard({
  notification,
  onSnooze,
}: {
  notification: AppNotification;
  onSnooze: (n: AppNotification) => void;
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

  return (
    <Card className={notification.isRead ? "opacity-70" : undefined}>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{notification.title}</span>
            {!notification.isRead && <Badge variant="default">Chưa đọc</Badge>}
            {notification.snoozedUntil && (
              <Badge variant="warning">
                Snooze → {formatDateTime(notification.snoozedUntil)}
              </Badge>
            )}
          </div>
          {notification.message && (
            <p className="text-sm text-muted-foreground">{notification.message}</p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
            <span>Nhắc lúc: {formatDateTime(notification.scheduledFor)}</span>
            <span>
              {notification.sentAt
                ? `Đã gửi: ${formatDateTime(notification.sentAt)}`
                : "Chưa tới hạn"}
            </span>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            title={notification.isRead ? "Đã đọc" : "Đánh dấu đã đọc"}
            disabled={busy || notification.isRead}
            onClick={() => run(() => markReadMut.mutateAsync(notification.id))}
          >
            <Check
              className={
                notification.isRead ? "h-4 w-4 text-success" : "h-4 w-4"
              }
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Snooze"
            disabled={busy}
            onClick={() => onSnooze(notification)}
          >
            <AlarmClockOff className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Xoá (soft delete)"
            disabled={busy}
            onClick={() => run(() => deleteMut.mutateAsync(notification.id))}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function NotificationsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-lg bg-muted"
          aria-hidden
        />
      ))}
    </div>
  );
}
