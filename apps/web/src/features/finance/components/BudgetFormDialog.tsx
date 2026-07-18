"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCreateBudget, useUpdateBudget } from "../hooks/useFinance";
import { BUDGET_PERIODS, type Budget, type BudgetPeriod } from "../types/finance.types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  budget?: Budget | null;
}

export function BudgetFormDialog({ open, onOpenChange, budget }: Props) {
  const isEdit = !!budget;
  const createMut = useCreateBudget();
  const updateMut = useUpdateBudget();
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    name: "",
    category: "",
    amount: "",
    period: "MONTHLY" as BudgetPeriod,
    startDate: "",
    endDate: "",
  });

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      name: budget?.name ?? "",
      category: budget?.category ?? "",
      amount: budget?.amount != null ? String(budget.amount) : "",
      period: budget?.period ?? "MONTHLY",
      startDate: budget?.startDate ?? "",
      endDate: budget?.endDate ?? "",
    });
  }, [open, budget]);

  const submitting = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountNum = Number(form.amount);
    if (!(amountNum > 0)) {
      setError("Ngân sách phải lớn hơn 0.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      amount: amountNum,
      period: form.period,
      ...(form.category.trim() ? { category: form.category.trim() } : {}),
      ...(form.startDate ? { startDate: form.startDate } : {}),
      ...(form.endDate ? { endDate: form.endDate } : {}),
    };
    try {
      if (isEdit && budget) await updateMut.mutateAsync({ id: budget.id, payload });
      else await createMut.mutateAsync(payload);
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={isEdit ? "Sửa ngân sách" : "Tạo ngân sách"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="b-name">Tên *</Label>
          <Input
            id="b-name"
            required
            maxLength={100}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="VD: Ăn uống tháng"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="b-category">Danh mục</Label>
            <Input
              id="b-category"
              maxLength={100}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="Bỏ trống = tổng chi"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-amount">Ngân sách (&gt; 0) *</Label>
            <Input
              id="b-amount"
              type="number"
              step="0.01"
              min={0}
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="b-period">Kỳ</Label>
            <Select
              id="b-period"
              value={form.period}
              onChange={(e) => setForm((f) => ({ ...f, period: e.target.value as BudgetPeriod }))}
            >
              {BUDGET_PERIODS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-start">Từ ngày</Label>
            <Input
              id="b-start"
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="b-end">Đến ngày</Label>
            <Input
              id="b-end"
              type="date"
              value={form.endDate}
              onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Bỏ trống ngày → mặc định tháng hiện tại. actual = tổng chi cùng danh mục (loại transfer).
        </p>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
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
