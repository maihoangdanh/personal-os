"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCreateMilestone, useUpdateMilestone } from "../hooks/useProjects";
import type { CreateMilestonePayload, Milestone } from "../types/projects.types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  projectId: string;
  milestone?: Milestone | null;
}

function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function MilestoneFormDialog({ open, onOpenChange, projectId, milestone }: Props) {
  const isEdit = !!milestone;
  const createMut = useCreateMilestone();
  const updateMut = useUpdateMilestone();
  const [error, setError] = React.useState<string | null>(null);
  const [title, setTitle] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle(milestone?.title ?? "");
    setDueDate(isoToLocalInput(milestone?.dueDate ?? null));
  }, [open, milestone]);

  const submitting = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const dueIso = dueDate ? new Date(dueDate).toISOString() : undefined;
    try {
      if (isEdit && milestone) {
        await updateMut.mutateAsync({
          id: milestone.id,
          payload: { title: title.trim(), ...(dueIso ? { dueDate: dueIso } : {}) },
        });
      } else {
        const payload: CreateMilestonePayload = {
          projectId,
          title: title.trim(),
          ...(dueIso ? { dueDate: dueIso } : {}),
        };
        await createMut.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={isEdit ? "Sửa Milestone" : "Tạo Milestone"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="m-title">Tiêu đề *</Label>
          <Input
            id="m-title"
            required
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Hoàn thành beta"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="m-due">Hạn (dueDate)</Label>
          <Input
            id="m-due"
            type="datetime-local"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          isCompleted do backend tự tính (mọi task gán milestone đều DONE) — không tick tay được.
        </p>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Huỷ
          </Button>
          <Button type="submit" disabled={submitting || !title.trim()}>
            {submitting ? "Đang lưu..." : isEdit ? "Lưu" : "Tạo"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
