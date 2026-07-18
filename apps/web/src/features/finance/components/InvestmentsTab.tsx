"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useCreateInvestment,
  useDeleteInvestment,
  useInvestments,
  useUpdateInvestment,
} from "../hooks/useFinance";
import type { Investment } from "../types/finance.types";

export function InvestmentsTab() {
  const { data, isLoading, isError, error } = useInvestments();
  const deleteMut = useDeleteInvestment();
  const [dialog, setDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<Investment | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDialog(true);
          }}
        >
          <Plus className="h-4 w-4" /> Thêm đầu tư
        </Button>
      </div>
      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
      )}
      {isLoading && <div className="h-20 animate-pulse rounded-lg bg-muted" />}
      {isError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {extractApiErrorMessage(error)}
        </p>
      )}
      {!isLoading && !isError && data && data.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Chưa có khoản đầu tư nào.
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {data?.map((inv) => (
          <Card key={inv.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{inv.name}</span>
                  {inv.type && <Badge variant="secondary">{inv.type}</Badge>}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Vốn {formatCurrency(inv.amount)} · Hiện tại{" "}
                  <span className="font-medium text-foreground">
                    {formatCurrency(inv.currentValue ?? inv.amount)}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Sửa"
                  onClick={() => {
                    setEditing(inv);
                    setDialog(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Xoá"
                  disabled={deleteMut.isPending}
                  onClick={async () => {
                    setActionError(null);
                    try {
                      await deleteMut.mutateAsync(inv.id);
                    } catch (e) {
                      setActionError(extractApiErrorMessage(e));
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <InvestmentFormDialog open={dialog} onOpenChange={setDialog} investment={editing} />
    </div>
  );
}

function InvestmentFormDialog({
  open,
  onOpenChange,
  investment,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  investment?: Investment | null;
}) {
  const isEdit = !!investment;
  const createMut = useCreateInvestment();
  const updateMut = useUpdateInvestment();
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({ name: "", type: "", amount: "", currentValue: "" });

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({
      name: investment?.name ?? "",
      type: investment?.type ?? "",
      amount: investment?.amount != null ? String(investment.amount) : "",
      currentValue: investment?.currentValue != null ? String(investment.currentValue) : "",
    });
  }, [open, investment]);

  const submitting = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountNum = Number(form.amount);
    if (!(amountNum > 0)) {
      setError("Vốn phải lớn hơn 0.");
      return;
    }
    const payload = {
      name: form.name.trim(),
      amount: amountNum,
      ...(form.type.trim() ? { type: form.type.trim() } : {}),
      ...(form.currentValue !== "" ? { currentValue: Number(form.currentValue) } : {}),
    };
    try {
      if (isEdit && investment) await updateMut.mutateAsync({ id: investment.id, payload });
      else await createMut.mutateAsync(payload);
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={isEdit ? "Sửa đầu tư" : "Thêm đầu tư"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="i-name">Tên *</Label>
          <Input
            id="i-name"
            required
            maxLength={255}
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="VD: Bitcoin"
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="i-type">Loại</Label>
            <Input
              id="i-type"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              placeholder="crypto"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-amount">Vốn (&gt; 0) *</Label>
            <Input
              id="i-amount"
              type="number"
              step="0.01"
              min={0}
              required
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="i-current">Giá trị hiện tại</Label>
            <Input
              id="i-current"
              type="number"
              step="0.01"
              min={0}
              value={form.currentValue}
              onChange={(e) => setForm((f) => ({ ...f, currentValue: e.target.value }))}
              placeholder="mặc định = vốn"
            />
          </div>
        </div>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Huỷ
          </Button>
          <Button type="submit" disabled={submitting || !form.name.trim()}>
            {submitting ? "Đang lưu..." : isEdit ? "Lưu" : "Thêm"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
