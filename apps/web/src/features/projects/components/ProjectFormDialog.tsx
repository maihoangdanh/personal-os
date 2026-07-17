"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useVisions, useGoals } from "@/features/goals/hooks/useGoals";
import { useCreateProject, useUpdateProject } from "../hooks/useProjects";
import {
  PROJECT_STATUSES,
  type CreateProjectPayload,
  type Project,
} from "../types/projects.types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** cố định goalId (tạo trong 1 goal); nếu không truyền, form cho chọn Goal */
  goalId?: string;
  project?: Project | null;
}

export function ProjectFormDialog({ open, onOpenChange, goalId, project }: Props) {
  const isEdit = !!project;
  const createMut = useCreateProject();
  const updateMut = useUpdateProject();
  const { data: visions } = useVisions();
  const { data: goals } = useGoals(); // tất cả goal (pageSize 100) để chọn khi tạo
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    title: "",
    status: "PLANNING" as Project["status"],
    goalId: goalId ?? "",
  });

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      title: project?.title ?? "",
      status: project?.status ?? "PLANNING",
      goalId: project?.goalId ?? goalId ?? "",
    });
  }, [open, project, goalId]);

  const submitting = createMut.isPending || updateMut.isPending;
  const visionTitle = (id: string) => visions?.find((v) => v.id === id)?.title ?? "";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit && project) {
        await updateMut.mutateAsync({
          id: project.id,
          payload: { title: form.title.trim(), status: form.status },
        });
      } else {
        if (!form.goalId) {
          setError("Vui lòng chọn Goal cho Project.");
          return;
        }
        const payload: CreateProjectPayload = {
          goalId: form.goalId,
          title: form.title.trim(),
          status: form.status,
        };
        await createMut.mutateAsync(payload);
      }
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={isEdit ? "Sửa Project" : "Tạo Project"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="p-title">Tiêu đề *</Label>
          <Input
            id="p-title"
            required
            maxLength={255}
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="VD: Ra mắt sản phẩm v1"
          />
        </div>

        {!isEdit && !goalId && (
          <div className="space-y-1.5">
            <Label htmlFor="p-goal">Goal *</Label>
            <Select
              id="p-goal"
              value={form.goalId}
              onChange={(e) => setForm((f) => ({ ...f, goalId: e.target.value }))}
            >
              <option value="">— Chọn Goal —</option>
              {goals?.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                  {visionTitle(g.visionId) ? ` (${visionTitle(g.visionId)})` : ""}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="p-status">Status</Label>
          <Select
            id="p-status"
            value={form.status}
            onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Project["status"] }))}
          >
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <p className="text-xs text-muted-foreground">
            Không đặt COMPLETED khi còn task DOING (backend chặn 422). Progress do backend tự tính.
          </p>
        </div>

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
