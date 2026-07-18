"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Sparkles } from "lucide-react";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useProjects, useMilestones } from "@/features/projects/hooks/useProjects";
import { useClassifyTask } from "@/features/ai/hooks/useAi";
import { useCreateTask, useUpdateTask } from "../hooks/useTasks";
import { STATUS_LABELS } from "../lib/status";
import {
  TASK_STATUSES,
  type CreateTaskPayload,
  type Task,
  type UpdateTaskPayload,
} from "../types/task.types";

interface TaskFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** truyền vào để sửa; bỏ trống = tạo mới */
  task?: Task | null;
  /** preset project khi tạo task từ trang chi tiết Project */
  defaultProjectId?: string;
}

function toIsoOrUndefined(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toISOString();
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TaskFormDialog({
  open,
  onOpenChange,
  task,
  defaultProjectId,
}: TaskFormDialogProps) {
  const isEdit = !!task;
  const createMut = useCreateTask();
  const updateMut = useUpdateTask();
  const { data: projects } = useProjects();
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    title: "",
    description: "",
    impact: 3,
    urgency: 3,
    estimateMinute: "",
    status: "TODO" as Task["status"],
    deadline: "",
    projectId: "",
    milestoneId: "",
  });

  // Milestone của project đang chọn (constraint: milestone phải cùng project).
  const { data: milestones } = useMilestones(form.projectId);

  // AI gợi ý Eisenhower — chỉ điền sẵn impact/urgency, KHÔNG tự submit (user vẫn sửa tay).
  const classifyMut = useClassifyTask();
  const [aiReason, setAiReason] = React.useState<string | null>(null);
  async function suggestWithAi() {
    setAiReason(null);
    if (!form.title.trim()) return;
    try {
      const r = await classifyMut.mutateAsync({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
      });
      setForm((f) => ({ ...f, impact: r.impact, urgency: r.urgency }));
      setAiReason(r.reason ?? `Gợi ý: ${r.quadrant} (impact ${r.impact} × urgency ${r.urgency})`);
    } catch (err) {
      setAiReason(extractApiErrorMessage(err, "AI không phản hồi, thử lại"));
    }
  }

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setAiReason(null);
    if (task) {
      setForm({
        title: task.title,
        description: task.description ?? "",
        impact: task.impact,
        urgency: task.urgency,
        estimateMinute: task.estimateMinute?.toString() ?? "",
        status: task.status,
        deadline: isoToLocalInput(task.deadline),
        projectId: task.projectId ?? "",
        milestoneId: task.milestoneId ?? "",
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
        projectId: defaultProjectId ?? "",
        milestoneId: "",
      });
    }
  }, [open, task, defaultProjectId]);

  const submitting = createMut.isPending || updateMut.isPending;

  // Khi đổi project → gỡ milestone đang chọn (milestone thuộc project cũ không còn hợp lệ).
  function changeProject(projectId: string) {
    setForm((f) => ({ ...f, projectId, milestoneId: "" }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const common = {
      title: form.title.trim(),
      impact: Number(form.impact),
      urgency: Number(form.urgency),
      status: form.status,
    };
    const iso = toIsoOrUndefined(form.deadline);

    try {
      if (isEdit && task) {
        const payload: UpdateTaskPayload = { ...common };
        payload.description = form.description.trim() || undefined;
        payload.estimateMinute =
          form.estimateMinute !== "" ? Number(form.estimateMinute) : undefined;
        if (iso) payload.deadline = iso;
        if (form.projectId) payload.projectId = form.projectId;
        // milestone: gán string, hoặc null để gỡ nếu task trước đó có milestone.
        if (form.milestoneId) payload.milestoneId = form.milestoneId;
        else if (task.milestoneId) payload.milestoneId = null;
        await updateMut.mutateAsync({ id: task.id, payload });
      } else {
        const payload: CreateTaskPayload = { ...common };
        if (form.description.trim()) payload.description = form.description.trim();
        if (form.estimateMinute !== "") payload.estimateMinute = Number(form.estimateMinute);
        if (iso) payload.deadline = iso;
        if (form.projectId) payload.projectId = form.projectId;
        if (form.milestoneId) payload.milestoneId = form.milestoneId;
        await createMut.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={isEdit ? "Sửa Task" : "Tạo Task mới"}>
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
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Chi tiết task (không bắt buộc)"
          />
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Độ ưu tiên</span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!form.title.trim() || classifyMut.isPending}
            onClick={suggestWithAi}
            title="AI gợi ý impact/urgency từ tiêu đề + mô tả"
          >
            <Sparkles className="h-4 w-4" />
            {classifyMut.isPending ? "AI đang phân tích..." : "Gợi ý AI"}
          </Button>
        </div>
        {aiReason && (
          <p className="rounded-md bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
            💡 {aiReason} <span className="italic">(gợi ý — bạn có thể chỉnh lại)</span>
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="impact">Impact (1-5) *</Label>
            <Select
              id="impact"
              value={form.impact}
              onChange={(e) => setForm((f) => ({ ...f, impact: Number(e.target.value) }))}
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
              onChange={(e) => setForm((f) => ({ ...f, urgency: Number(e.target.value) }))}
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
            <Label htmlFor="project">Project</Label>
            <Select
              id="project"
              value={form.projectId}
              onChange={(e) => changeProject(e.target.value)}
            >
              <option value="">Inbox (mặc định)</option>
              {projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="milestone">Milestone</Label>
            <Select
              id="milestone"
              value={form.milestoneId}
              disabled={!form.projectId}
              onChange={(e) => setForm((f) => ({ ...f, milestoneId: e.target.value }))}
            >
              <option value="">— Không —</option>
              {milestones?.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
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
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Task["status"] }))}
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
              onChange={(e) => setForm((f) => ({ ...f, estimateMinute: e.target.value }))}
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
            onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
          />
        </div>

        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
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
