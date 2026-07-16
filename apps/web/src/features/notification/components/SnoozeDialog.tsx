"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api-client";
import { isoToLocalInput, localInputToIso } from "@/lib/datetime-input";
import { useSnooze } from "../hooks/useNotifications";
import type { AppNotification } from "../types/notification.types";

interface SnoozeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notification: AppNotification | null;
}

/** Snooze = dời giờ nhắc. Chỉ gửi `snoozedUntil`; backend tự re-arm reminder. */
export function SnoozeDialog({ open, onOpenChange, notification }: SnoozeDialogProps) {
  const snoozeMut = useSnooze();
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    // Prefill: giờ snooze cũ, hoặc scheduledFor hiện tại nếu chưa từng snooze.
    setValue(
      isoToLocalInput(notification?.snoozedUntil ?? notification?.scheduledFor ?? null),
    );
  }, [open, notification]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!notification) return;
    setError(null);

    const iso = localInputToIso(value);
    if (!iso) {
      setError("Vui lòng chọn thời điểm snooze hợp lệ.");
      return;
    }

    try {
      await snoozeMut.mutateAsync({
        id: notification.id,
        payload: { snoozedUntil: iso },
      });
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Snooze reminder"
      description={notification?.title}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="snooze-until">Nhắc lại vào lúc *</Label>
          <Input
            id="snooze-until"
            type="datetime-local"
            required
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Reminder sẽ được đặt lại về chưa đọc và kêu lại vào thời điểm này.
          </p>
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={snoozeMut.isPending}
          >
            Huỷ
          </Button>
          <Button type="submit" disabled={snoozeMut.isPending || !value}>
            {snoozeMut.isPending ? "Đang lưu..." : "Snooze"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
