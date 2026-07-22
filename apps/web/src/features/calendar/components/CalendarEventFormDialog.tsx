"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api-client";
import { isoToLocalInput, localInputToIso } from "@/lib/datetime-input";
import {
  useCreateCalendarEvent,
  useDeleteCalendarEvent,
  useUpdateCalendarEvent,
} from "../hooks/useCalendarEvents";
import type {
  CalendarEvent,
  CreateCalendarEventPayload,
  UpdateCalendarEventPayload,
} from "../types/calendar.types";

interface CalendarEventFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** truyền vào để sửa; bỏ trống = tạo mới */
  event?: CalendarEvent | null;
}

export function CalendarEventFormDialog({
  open,
  onOpenChange,
  event,
}: CalendarEventFormDialogProps) {
  const isEdit = !!event;
  const createMut = useCreateCalendarEvent();
  const updateMut = useUpdateCalendarEvent();
  const deleteMut = useDeleteCalendarEvent();
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    title: "",
    description: "",
    startTime: "",
    endTime: "",
    location: "",
    allDay: false,
  });

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (event) {
      setForm({
        title: event.title,
        description: event.description ?? "",
        startTime: isoToLocalInput(event.startTime),
        endTime: isoToLocalInput(event.endTime),
        location: event.location ?? "",
        allDay: event.allDay,
      });
    } else {
      setForm({
        title: "",
        description: "",
        startTime: "",
        endTime: "",
        location: "",
        allDay: false,
      });
    }
  }, [open, event]);

  const submitting = createMut.isPending || updateMut.isPending || deleteMut.isPending;

  async function handleDelete() {
    if (!event) return;
    try {
      await deleteMut.mutateAsync(event.id);
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const startIso = localInputToIso(form.startTime);
    if (!startIso) {
      setError("Vui lòng chọn thời gian bắt đầu.");
      return;
    }
    const endIso = localInputToIso(form.endTime);

    // Validate khớp backend (422): endTime phải SAU startTime — chặn ngay ở form.
    if (endIso && new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setError("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }

    try {
      if (isEdit && event) {
        const payload: UpdateCalendarEventPayload = {
          title: form.title.trim(),
          description: form.description.trim() || undefined,
          startTime: startIso,
          // endTime để trống khi sửa = clear (gửi null theo hợp đồng backend).
          endTime: endIso ?? null,
          location: form.location.trim() || undefined,
          allDay: form.allDay,
        };
        await updateMut.mutateAsync({ id: event.id, payload });
      } else {
        const payload: CreateCalendarEventPayload = {
          title: form.title.trim(),
          startTime: startIso,
          allDay: form.allDay,
        };
        if (form.description.trim()) payload.description = form.description.trim();
        if (endIso) payload.endTime = endIso;
        if (form.location.trim()) payload.location = form.location.trim();
        await createMut.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? "Sửa sự kiện" : "Tạo sự kiện mới"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="event-title">Tiêu đề *</Label>
          <Input
            id="event-title"
            required
            maxLength={255}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="VD: Họp nhóm dự án"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event-description">Mô tả</Label>
          <Textarea
            id="event-description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Chi tiết sự kiện (không bắt buộc)"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="event-start">Bắt đầu *</Label>
            <Input
              id="event-start"
              type="datetime-local"
              required
              value={form.startTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, startTime: e.target.value }))
              }
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-end">Kết thúc</Label>
            <Input
              id="event-end"
              type="datetime-local"
              value={form.endTime}
              onChange={(e) =>
                setForm((f) => ({ ...f, endTime: e.target.value }))
              }
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event-location">Địa điểm</Label>
          <Input
            id="event-location"
            maxLength={255}
            value={form.location}
            onChange={(e) =>
              setForm((f) => ({ ...f, location: e.target.value }))
            }
            placeholder="VD: Phòng họp A / Google Meet"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input"
            checked={form.allDay}
            onChange={(e) =>
              setForm((f) => ({ ...f, allDay: e.target.checked }))
            }
          />
          Sự kiện cả ngày
        </label>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          {isEdit ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleDelete}
              disabled={submitting}
            >
              {deleteMut.isPending ? "Đang xoá..." : "Xoá sự kiện"}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Huỷ
            </Button>
            <Button
              type="submit"
              disabled={submitting || !form.title.trim() || !form.startTime}
            >
              {submitting ? "Đang lưu..." : isEdit ? "Lưu" : "Tạo"}
            </Button>
          </div>
        </div>
      </form>
    </Dialog>
  );
}
