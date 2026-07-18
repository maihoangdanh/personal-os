"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useTransfer, useWallets } from "../hooks/useFinance";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

/** Form chuyển tiền ví→ví. Gọi POST /transactions/transfer (backend tạo 2 leg atomic). */
export function TransferFormDialog({ open, onOpenChange }: Props) {
  const transferMut = useTransfer();
  const { data: wallets } = useWallets();
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    fromWalletId: "",
    toWalletId: "",
    amount: "",
    description: "",
  });

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setForm({ fromWalletId: "", toWalletId: "", amount: "", description: "" });
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountNum = Number(form.amount);
    if (!(amountNum > 0)) {
      setError("Số tiền phải lớn hơn 0.");
      return;
    }
    if (!form.fromWalletId || !form.toWalletId) {
      setError("Chọn cả ví nguồn và ví đích.");
      return;
    }
    if (form.fromWalletId === form.toWalletId) {
      setError("Ví nguồn và ví đích phải khác nhau.");
      return;
    }
    try {
      await transferMut.mutateAsync({
        fromWalletId: form.fromWalletId,
        toWalletId: form.toWalletId,
        amount: amountNum,
        ...(form.description.trim() ? { description: form.description.trim() } : {}),
      });
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title="Chuyển tiền giữa ví">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="tr-from">Từ ví *</Label>
          <Select
            id="tr-from"
            value={form.fromWalletId}
            onChange={(e) => setForm((f) => ({ ...f, fromWalletId: e.target.value }))}
          >
            <option value="">— Chọn ví nguồn —</option>
            {wallets?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tr-to">Đến ví *</Label>
          <Select
            id="tr-to"
            value={form.toWalletId}
            onChange={(e) => setForm((f) => ({ ...f, toWalletId: e.target.value }))}
          >
            <option value="">— Chọn ví đích —</option>
            {wallets?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tr-amount">Số tiền (&gt; 0) *</Label>
          <Input
            id="tr-amount"
            type="number"
            step="0.01"
            min={0}
            required
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            placeholder="VD: 500000"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="tr-desc">Ghi chú</Label>
          <Input
            id="tr-desc"
            maxLength={255}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Backend tạo 2 dòng (chi ở ví nguồn + thu ở ví đích) cùng nhóm chuyển tiền. Không tính vào
          thu/chi của báo cáo.
        </p>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={transferMut.isPending}>
            Huỷ
          </Button>
          <Button type="submit" disabled={transferMut.isPending}>
            {transferMut.isPending ? "Đang chuyển..." : "Chuyển"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
