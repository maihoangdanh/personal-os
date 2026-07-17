"use client";

import * as React from "react";
import { Pencil, Plus, Trash2, Wallet as WalletIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useDeleteWallet, useWallets } from "../hooks/useFinance";
import type { Wallet } from "../types/finance.types";
import { WALLET_TYPE_LABELS, WalletFormDialog } from "./WalletFormDialog";

export function WalletsTab() {
  const { data: wallets, isLoading, isError, error } = useWallets();
  const deleteMut = useDeleteWallet();
  const [dialog, setDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<Wallet | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const total = wallets?.reduce((s, w) => s + w.balance, 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Tổng số dư: <span className="font-semibold text-foreground">{formatCurrency(total)}</span>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialog(true);
          }}
        >
          <Plus className="h-4 w-4" /> Tạo ví
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
      {!isLoading && !isError && wallets && wallets.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Chưa có ví nào. Tạo ví để bắt đầu ghi giao dịch.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {wallets?.map((w) => (
          <Card key={w.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <WalletIcon className="h-4 w-4 text-primary" />
                  <span className="truncate font-medium">{w.name}</span>
                  <Badge variant="secondary">{WALLET_TYPE_LABELS[w.type]}</Badge>
                </div>
                <div className="mt-1 text-lg font-semibold">{formatCurrency(w.balance)}</div>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  title="Sửa"
                  onClick={() => {
                    setEditing(w);
                    setDialog(true);
                  }}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Xoá (422 nếu còn giao dịch)"
                  disabled={deleteMut.isPending}
                  onClick={async () => {
                    setActionError(null);
                    try {
                      await deleteMut.mutateAsync(w.id);
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

      <WalletFormDialog open={dialog} onOpenChange={setDialog} wallet={editing} />
    </div>
  );
}
