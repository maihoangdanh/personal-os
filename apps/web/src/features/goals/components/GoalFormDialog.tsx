"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCreateGoal, useUpdateGoal } from "../hooks/useGoals";
import { GOAL_STATUSES, type CreateGoalPayload, type Goal } from "../types/goals.types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  visionId: string; // bắt buộc khi tạo mới trong 1 Vision
  goal?: Goal | null;
}

export function GoalFormDialog({ open, onOpenChange, visionId, goal }: Props) {
  const isEdit = !!goal;
  const createMut = useCreateGoal();
  const updateMut = useUpdateGoal();
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    title: "",
    targetValue: "",
    currentValue: "",
    deadline: "",
    status: "ACTIVE" as Goal["status"],
  });

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      title: goal?.title ?? "",
      targetValue: goal?.targetValue != null ? String(goal.targetValue) : "",
      currentValue: goal?.currentValue != null ? String(goal.currentValue) : "",
      deadline: goal?.deadline ?? "",
      status: goal?.status ?? "ACTIVE",
    });
  }, [open, goal]);

  const submitting = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const base = {
      title: form.title.trim(),
      status: form.status,
      ...(form.targetValue !== "" ? { targetValue: Number(form.targetValue) } : {}),
      ...(form.currentValue !== "" ? { currentValue: Number(form.currentValue) } : {}),
      ...(form.deadline !== "" ? { deadline: form.deadline } : {}),
    };
    try {
      if (isEdit && goal) {
        await updateMut.mutateAsync({ id: goal.id, payload: base });
      } else {
        const payload: CreateGoalPayload = { visionId, ...base };
        await createMut.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={isEdit ? "Sửa Goal" : "Tạo Goal"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="g-title">Tiêu đề *</Label>
          <Input
            id="g-title"
            required
            maxLength={255}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="VD: Đạt 500tr tiết kiệm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="g-target">Target value</Label>
            <Input
              id="g-target"
              type="number"
              step="0.01"
              min={0}
              value={form.targetValue}
              onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}
              placeholder="VD: 500"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-current">Current value</Label>
            <Input
              id="g-current"
              type="number"
              step="0.01"
              min={0}
              value={form.currentValue}
              onChange={(e) => setForm((f) => ({ ...f, currentValue: e.target.value }))}
              placeholder="VD: 120"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="g-deadline">Deadline</Label>
            <Input
              id="g-deadline"
              type="date"
              value={form.deadline}
              onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="g-status">Status</Label>
            <Select
              id="g-status"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Goal["status"] }))}
            >
              {GOAL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Progress = current / target (backend tự tính). Current value nhập tay, không auto rollup.
        </p>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
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
