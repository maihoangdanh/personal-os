"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useCreateTransaction,
  useTransactions,
  useUpdateTransaction,
  useWallets,
} from "../hooks/useFinance";
import {
  TRANSACTION_TYPES,
  type Transaction,
  type TransactionType,
} from "../types/finance.types";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  transaction?: Transaction | null;
  defaultWalletId?: string;
}

function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TransactionFormDialog({ open, onOpenChange, transaction, defaultWalletId }: Props) {
  const isEdit = !!transaction;
  const createMut = useCreateTransaction();
  const updateMut = useUpdateTransaction();
  const { data: wallets } = useWallets();
  const { data: allTx } = useTransactions(); // gợi ý category từ giao dịch đã dùng
  const [error, setError] = React.useState<string | null>(null);
  const [form, setForm] = React.useState({
    walletId: "",
    type: "EXPENSE" as TransactionType,
    amount: "",
    category: "",
    description: "",
    transactionDate: "",
  });

  const categorySuggestions = React.useMemo(() => {
    const set = new Set<string>();
    (allTx ?? []).forEach((t) => t.category && set.add(t.category));
    return [...set];
  }, [allTx]);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    if (transaction) {
      setForm({
        walletId: transaction.walletId,
        type: transaction.type,
        amount: String(transaction.amount),
        category: transaction.category ?? "",
        description: transaction.description ?? "",
        transactionDate: isoToLocalInput(transaction.transactionDate),
      });
    } else {
      setForm({
        walletId: defaultWalletId ?? wallets?.[0]?.id ?? "",
        type: "EXPENSE",
        amount: "",
        category: "",
        description: "",
        transactionDate: "",
      });
    }
  }, [open, transaction, defaultWalletId, wallets]);

  const submitting = createMut.isPending || updateMut.isPending;
  const isTransferLeg = !!transaction?.transferGroupId;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountNum = Number(form.amount);
    if (!(amountNum > 0)) {
      setError("Số tiền phải lớn hơn 0.");
      return;
    }
    const iso = form.transactionDate ? new Date(form.transactionDate).toISOString() : undefined;
    try {
      if (isEdit && transaction) {
        await updateMut.mutateAsync({
          id: transaction.id,
          payload: {
            type: form.type,
            amount: amountNum,
            category: form.category.trim() || undefined,
            description: form.description.trim() || undefined,
            ...(iso ? { transactionDate: iso } : {}),
          },
        });
      } else {
        await createMut.mutateAsync({
          walletId: form.walletId,
          type: form.type,
          amount: amountNum,
          ...(form.category.trim() ? { category: form.category.trim() } : {}),
          ...(form.description.trim() ? { description: form.description.trim() } : {}),
          ...(iso ? { transactionDate: iso } : {}),
        });
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
      title={isEdit ? "Sửa giao dịch" : "Ghi thu / chi"}
    >
      {isTransferLeg ? (
        <p className="rounded-md bg-warning/15 px-3 py-2 text-sm">
          Đây là một vế của giao dịch chuyển tiền — không sửa riêng được (backend chặn 422). Hãy xoá
          cả cặp transfer nếu cần.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isEdit && (
            <div className="space-y-1.5">
              <Label htmlFor="t-wallet">Ví *</Label>
              <Select
                id="t-wallet"
                value={form.walletId}
                onChange={(e) => setForm((f) => ({ ...f, walletId: e.target.value }))}
              >
                <option value="">— Chọn ví —</option>
                {wallets?.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="t-type">Loại *</Label>
              <Select
                id="t-type"
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as TransactionType }))}
              >
                {TRANSACTION_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t === "INCOME" ? "Thu (Income)" : "Chi (Expense)"}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="t-amount">Số tiền (&gt; 0) *</Label>
              <Input
                id="t-amount"
                type="number"
                step="0.01"
                min={0}
                required
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="VD: 150000"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-category">Danh mục</Label>
            <Input
              id="t-category"
              list="tx-categories"
              maxLength={100}
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              placeholder="VD: Ăn uống, Lương..."
            />
            <datalist id="tx-categories">
              {categorySuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-desc">Ghi chú</Label>
            <Input
              id="t-desc"
              maxLength={255}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="t-date">Ngày giao dịch (mặc định: hiện tại)</Label>
            <Input
              id="t-date"
              type="datetime-local"
              value={form.transactionDate}
              onChange={(e) => setForm((f) => ({ ...f, transactionDate: e.target.value }))}
            />
          </div>
          {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Huỷ
            </Button>
            <Button type="submit" disabled={submitting || (!isEdit && !form.walletId)}>
              {submitting ? "Đang lưu..." : isEdit ? "Lưu" : "Ghi"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
