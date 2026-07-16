"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api-client";
import { localInputToIso } from "@/lib/datetime-input";
import { useCreateNotification } from "../hooks/useNotifications";
import type { CreateNotificationPayload } from "../types/notification.types";

interface ReminderFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Tạo Reminder mới (type mặc định REMINDER phía backend). Không có edit — backend không hỗ trợ PATCH title/message. */
export function ReminderFormDialog({ open, onOpenChange }: ReminderFormDialogProps) {
  const createMut = useCreateNotification();
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    title: "",
    message: "",
    scheduledFor: "",
  });

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({ title: "", message: "", scheduledFor: "" });
  }, [open]);

  const submitting = createMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: CreateNotificationPayload = {
      title: form.title.trim(),
      type: "REMINDER",
    };
    if (form.message.trim()) payload.message = form.message.trim();
    const iso = localInputToIso(form.scheduledFor);
    if (iso) payload.scheduledFor = iso;

    try {
      await createMut.mutateAsync(payload);
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Tạo Reminder mới">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reminder-title">Tiêu đề *</Label>
          <Input
            id="reminder-title"
            required
            maxLength={255}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="VD: Gọi điện cho khách hàng"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reminder-message">Nội dung</Label>
          <Textarea
            id="reminder-message"
            value={form.message}
            onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
            placeholder="Chi tiết lời nhắc (không bắt buộc)"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reminder-scheduled">Thời điểm nhắc</Label>
          <Input
            id="reminder-scheduled"
            type="datetime-local"
            value={form.scheduledFor}
            onChange={(e) =>
              setForm((f) => ({ ...f, scheduledFor: e.target.value }))
            }
          />
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
            disabled={submitting}
          >
            Huỷ
          </Button>
          <Button type="submit" disabled={submitting || !form.title.trim()}>
            {submitting ? "Đang lưu..." : "Tạo"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
