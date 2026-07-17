"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCreateVision, useUpdateVision } from "../hooks/useGoals";
import type { Vision } from "../types/goals.types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  vision?: Vision | null;
}

export function VisionFormDialog({ open, onOpenChange, vision }: Props) {
  const isEdit = !!vision;
  const createMut = useCreateVision();
  const updateMut = useUpdateVision();
  const [title, setTitle] = React.useState("");
  const [targetYear, setTargetYear] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setTitle(vision?.title ?? "");
    setTargetYear(vision?.targetYear != null ? String(vision.targetYear) : "");
  }, [open, vision]);

  const submitting = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload = {
      title: title.trim(),
      ...(targetYear !== "" ? { targetYear: Number(targetYear) } : {}),
    };
    try {
      if (isEdit && vision) await updateMut.mutateAsync({ id: vision.id, payload });
      else await createMut.mutateAsync(payload);
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={isEdit ? "Sửa Vision" : "Tạo Vision"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="v-title">Tiêu đề *</Label>
          <Input
            id="v-title"
            required
            maxLength={255}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="VD: Tự do tài chính 2030"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="v-year">Năm mục tiêu</Label>
          <Input
            id="v-year"
            type="number"
            min={1900}
            max={3000}
            value={targetYear}
            onChange={(e) => setTargetYear(e.target.value)}
            placeholder="VD: 2030"
          />
        </div>
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
