"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCreateTask, useUpdateTask } from "../hooks/useTasks";
import { STATUS_LABELS } from "../lib/status";
import {
  TASK_STATUSES,
  type CreateTaskPayload,
  type Task,
} from "../types/task.types";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** truyền vào để sửa; bỏ trống = tạo mới */
  task?: Task | null;
}

/** Chuyển giá trị input datetime-local (local time) → ISO string cho backend. */
function toIsoOrUndefined(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

/** Chuyển ISO (từ task) → giá trị datetime-local để prefill khi sửa. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskFormDialog({ open, onOpenChange, task }: TaskFormDialogProps) {
  const isEdit = !!task;
  const createMut = useCreateTask();
  const updateMut = useUpdateTask();
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    title: "",
    description: "",
    impact: 3,
    urgency: 3,
    estimateMinute: "",
    status: "TODO" as Task["status"],
    deadline: "",
  });

  // Prefill khi mở dialog theo task đang sửa (hoặc reset khi tạo mới).
  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        impact: task.impact,
        urgency: task.urgency,
        estimateMinute: task.estimateMinute?.toString() ?? "",
        status: task.status,
        deadline: isoToLocalInput(task.deadline),
      });
    } else {
      setForm({
        title: "",
        description: "",
        impact: 3,
        urgency: 3,
        estimateMinute: "",
        status: "TODO",
        deadline: "",
      });
    }
  }, [open, task]);

  const submitting = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: CreateTaskPayload = {
      title: form.title.trim(),
      impact: Number(form.impact),
      urgency: Number(form.urgency),
      status: form.status,
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.estimateMinute !== "")
      payload.estimateMinute = Number(form.estimateMinute);
    const iso = toIsoOrUndefined(form.deadline);
    if (iso) payload.deadline = iso;

    try {
      if (isEdit && task) {
        await updateMut.mutateAsync({ id: task.id, payload });
      } else {
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
      title={isEdit ? "Sửa Task" : "Tạo Task mới"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="title">Tiêu đề *</Label>
          <Input
            id="title"
            required
            maxLength={255}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="VD: Viết báo cáo tuần"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Mô tả</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Chi tiết task (không bắt buộc)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="impact">Impact (1-5) *</Label>
            <Select
              id="impact"
              value={form.impact}
              onChange={(e) =>
                setForm((f) => ({ ...f, impact: Number(e.target.value) }))
              }
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="urgency">Urgency (1-5) *</Label>
            <Select
              id="urgency"
              value={form.urgency}
              onChange={(e) =>
                setForm((f) => ({ ...f, urgency: Number(e.target.value) }))
              }
            >
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="status">Status</Label>
            <Select
              id="status"
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value as Task["status"] }))
              }
            >
              {TASK_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="estimateMinute">Ước lượng (phút)</Label>
            <Input
              id="estimateMinute"
              type="number"
              min={0}
              value={form.estimateMinute}
              onChange={(e) =>
                setForm((f) => ({ ...f, estimateMinute: e.target.value }))
              }
              placeholder="VD: 60"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="deadline">Deadline (phải ở tương lai)</Label>
          <Input
            id="deadline"
            type="datetime-local"
            value={form.deadline}
            onChange={(e) =>
              setForm((f) => ({ ...f, deadline: e.target.value }))
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
            {submitting ? "Đang lưu..." : isEdit ? "Lưu" : "Tạo"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
