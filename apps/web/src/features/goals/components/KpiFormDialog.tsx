"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCreateKpi, useUpdateKpi } from "../hooks/useGoals";
import type { CreateKpiPayload, Kpi } from "../types/goals.types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  goalId: string;
  kpi?: Kpi | null;
}

export function KpiFormDialog({ open, onOpenChange, goalId, kpi }: Props) {
  const isEdit = !!kpi;
  const createMut = useCreateKpi();
  const updateMut = useUpdateKpi();
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: "", unit: "", targetValue: "", currentValue: "" });

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      name: kpi?.name ?? "",
      unit: kpi?.unit ?? "",
      targetValue: kpi?.targetValue != null ? String(kpi.targetValue) : "",
      currentValue: kpi?.currentValue != null ? String(kpi.currentValue) : "",
    });
  }, [open, kpi]);

  const submitting = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const base = {
      name: form.name.trim(),
      ...(form.unit.trim() ? { unit: form.unit.trim() } : {}),
      ...(form.targetValue !== "" ? { targetValue: Number(form.targetValue) } : {}),
      ...(form.currentValue !== "" ? { currentValue: Number(form.currentValue) } : {}),
    };
    try {
      if (isEdit && kpi) await updateMut.mutateAsync({ id: kpi.id, payload: base });
      else await createMut.mutateAsync({ goalId, ...base } as CreateKpiPayload);
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={isEdit ? "Sửa KPI" : "Tạo KPI"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="k-name">Tên KPI *</Label>
          <Input
            id="k-name"
            required
            maxLength={255}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="VD: Số km chạy bộ"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="k-unit">Đơn vị</Label>
            <Input
              id="k-unit"
              maxLength={50}
              value={form.unit}
              onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
              placeholder="km"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="k-target">Target</Label>
            <Input
              id="k-target"
              type="number"
              step="0.01"
              value={form.targetValue}
              onChange={(e) => setForm((f) => ({ ...f, targetValue: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="k-current">Current</Label>
            <Input
              id="k-current"
              type="number"
              step="0.01"
              min={0}
              value={form.currentValue}
              onChange={(e) => setForm((f) => ({ ...f, currentValue: e.target.value }))}
            />
          </div>
        </div>
        {error && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
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
