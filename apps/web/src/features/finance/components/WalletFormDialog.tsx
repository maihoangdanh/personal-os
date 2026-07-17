"use client";

import * as React from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCreateWallet, useUpdateWallet } from "../hooks/useFinance";
import { WALLET_TYPES, type Wallet, type WalletType } from "../types/finance.types";

export const WALLET_TYPE_LABELS: Record<WalletType, string> = {
  CASH: "Tiền mặt",
  BANK: "Ngân hàng",
  CREDIT_CARD: "Thẻ tín dụng",
  E_WALLET: "Ví điện tử",
  SAVINGS: "Tiết kiệm",
};

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  wallet?: Wallet | null;
}

export function WalletFormDialog({ open, onOpenChange, wallet }: Props) {
  const isEdit = !!wallet;
  const createMut = useCreateWallet();
  const updateMut = useUpdateWallet();
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState<WalletType>("CASH");
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setError(null);
    setName(wallet?.name ?? "");
    setType(wallet?.type ?? "CASH");
  }, [open, wallet]);

  const submitting = createMut.isPending || updateMut.isPending;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      if (isEdit && wallet) await updateMut.mutateAsync({ id: wallet.id, payload: { name: name.trim(), type } });
      else await createMut.mutateAsync({ name: name.trim(), type });
      onOpenChange(false);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={isEdit ? "Sửa ví" : "Tạo ví"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="w-name">Tên ví *</Label>
          <Input
            id="w-name"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="VD: Vietcombank"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="w-type">Loại ví *</Label>
          <Select id="w-type" value={type} onChange={(e) => setType(e.target.value as WalletType)}>
            {WALLET_TYPES.map((t) => (
              <option key={t} value={t}>
                {WALLET_TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">Balance do backend tự tính từ giao dịch, không nhập tay.</p>
        {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Huỷ
          </Button>
          <Button type="submit" disabled={submitting || !name.trim()}>
            {submitting ? "Đang lưu..." : isEdit ? "Lưu" : "Tạo"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
