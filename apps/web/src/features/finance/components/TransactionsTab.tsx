"use client";

import * as React from "react";
import { ArrowLeftRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useDeleteTransaction, useTransactions, useWallets } from "../hooks/useFinance";
import {
  TRANSACTION_TYPES,
  type Transaction,
  type TransactionFilter,
  type TransactionType,
} from "../types/finance.types";
import { TransactionFormDialog } from "./TransactionFormDialog";
import { TransferFormDialog } from "./TransferFormDialog";

export function TransactionsTab() {
  const { data: wallets } = useWallets();
  const [filter, setFilter] = React.useState<TransactionFilter>({});
  const { data: txs, isLoading, isError, error } = useTransactions(filter);
  const deleteMut = useDeleteTransaction();

  const [txDialog, setTxDialog] = React.useState(false);
  const [transferDialog, setTransferDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<Transaction | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const walletName = (id: string) => wallets?.find((w) => w.id === id)?.name ?? "—";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Select
            className="w-40"
            value={filter.walletId ?? ""}
            onChange={(e) => setFilter((f) => ({ ...f, walletId: e.target.value || undefined }))}
          >
            <option value="">Mọi ví</option>
            {wallets?.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </Select>
          <Select
            className="w-36"
            value={filter.type ?? ""}
            onChange={(e) =>
              setFilter((f) => ({ ...f, type: (e.target.value || undefined) as TransactionType | undefined }))
            }
          >
            <option value="">Thu & Chi</option>
            {TRANSACTION_TYPES.map((t) => (
              <option key={t} value={t}>
                {t === "INCOME" ? "Thu" : "Chi"}
              </option>
            ))}
          </Select>
          <Input
            className="w-40"
            placeholder="Lọc danh mục"
            value={filter.category ?? ""}
            onChange={(e) => setFilter((f) => ({ ...f, category: e.target.value || undefined }))}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTransferDialog(true)}>
            <ArrowLeftRight className="h-4 w-4" /> Chuyển tiền
          </Button>
          <Button
            onClick={() => {
              setEditing(null);
              setTxDialog(true);
            }}
          >
            <Plus className="h-4 w-4" /> Ghi thu / chi
          </Button>
        </div>
      </div>

      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
      )}
      {isLoading && <div className="h-24 animate-pulse rounded-lg bg-muted" />}
      {isError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {extractApiErrorMessage(error)}
        </p>
      )}
      {!isLoading && !isError && txs && txs.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Chưa có giao dịch nào.
        </div>
      )}

      {!isLoading && !isError && txs && txs.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Ngày</th>
                <th className="px-3 py-2 font-medium">Ví</th>
                <th className="px-3 py-2 font-medium">Danh mục</th>
                <th className="px-3 py-2 text-right font-medium">Số tiền</th>
                <th className="px-3 py-2 text-right font-medium">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {txs.map((t) => {
                const isTransfer = !!t.transferGroupId;
                return (
                  <tr key={t.id} className="hover:bg-muted/30">
                    <td className="px-3 py-2 text-muted-foreground">{formatDateTime(t.transactionDate)}</td>
                    <td className="px-3 py-2">{walletName(t.walletId)}</td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span>{t.category ?? "—"}</span>
                        {isTransfer && <Badge variant="secondary">Transfer</Badge>}
                      </div>
                      {t.description && <div className="text-xs text-muted-foreground">{t.description}</div>}
                    </td>
                    <td
                      className={cn(
                        "px-3 py-2 text-right font-medium",
                        t.type === "INCOME" ? "text-success" : "text-destructive",
                      )}
                    >
                      {t.type === "INCOME" ? "+" : "−"}
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        {!isTransfer && (
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Sửa"
                            onClick={() => {
                              setEditing(t);
                              setTxDialog(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          title={isTransfer ? "Xoá cả cặp transfer" : "Xoá"}
                          disabled={deleteMut.isPending}
                          onClick={async () => {
                            setActionError(null);
                            try {
                              await deleteMut.mutateAsync(t.id);
                            } catch (e) {
                              setActionError(extractApiErrorMessage(e));
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <TransactionFormDialog open={txDialog} onOpenChange={setTxDialog} transaction={editing} />
      <TransferFormDialog open={transferDialog} onOpenChange={setTransferDialog} />
    </div>
  );
}
