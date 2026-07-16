"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCreateHabit, useUpdateHabit } from "../hooks/useHabits";
import {
  HABIT_FREQUENCIES,
  type CreateHabitPayload,
  type Habit,
} from "../types/habit.types";

interface HabitFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** truyền vào để sửa; bỏ trống = tạo mới */
  habit?: Habit | null;
}

export function HabitFormDialog({ open, onOpenChange, habit }: HabitFormDialogProps) {
  const isEdit = !!habit;
  const createMut = useCreateHabit();
  const updateMut = useUpdateHabit();
  const [error, setError] = React.useState<string | null>(null);

  const [form, setForm] = React.useState({
    name: "",
    description: "",
    frequency: "DAILY",
    targetPerPeriod: "1",
  });

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (habit) {
      setForm({
        name: habit.name,
        description: habit.description ?? "",
        frequency: habit.frequency || "DAILY",
        targetPerPeriod: String(habit.targetPerPeriod ?? 1),
      });
    } else {
      setForm({ name: "", description: "", frequency: "DAILY", targetPerPeriod: "1" });
    }
  }, [open, habit]);

  const submitting = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const payload: CreateHabitPayload = {
      name: form.name.trim(),
      frequency: form.frequency,
    };
    if (form.description.trim()) payload.description = form.description.trim();
    if (form.targetPerPeriod !== "")
      payload.targetPerPeriod = Number(form.targetPerPeriod);

    try {
      if (isEdit && habit) {
        await updateMut.mutateAsync({ id: habit.id, payload });
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
      title={isEdit ? "Sửa Habit" : "Tạo Habit mới"}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="habit-name">Tên thói quen *</Label>
          <Input
            id="habit-name"
            required
            maxLength={255}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="VD: Đọc sách 30 phút"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="habit-description">Mô tả</Label>
          <Textarea
            id="habit-description"
            value={form.description}
            onChange={(e) =>
              setForm((f) => ({ ...f, description: e.target.value }))
            }
            placeholder="Chi tiết thói quen (không bắt buộc)"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="habit-frequency">Tần suất</Label>
            <Select
              id="habit-frequency"
              value={form.frequency}
              onChange={(e) =>
                setForm((f) => ({ ...f, frequency: e.target.value }))
              }
            >
              {HABIT_FREQUENCIES.map((f) => (
                <option key={f} value={f}>
                  {f === "DAILY" ? "Hàng ngày" : "Hàng tuần"}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="habit-target">Mục tiêu / kỳ</Label>
            <Input
              id="habit-target"
              type="number"
              min={1}
              max={1000}
              value={form.targetPerPeriod}
              onChange={(e) =>
                setForm((f) => ({ ...f, targetPerPeriod: e.target.value }))
              }
              placeholder="VD: 1"
            />
          </div>
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
          <Button type="submit" disabled={submitting || !form.name.trim()}>
            {submitting ? "Đang lưu..." : isEdit ? "Lưu" : "Tạo"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
