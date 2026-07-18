"use client";

import * as React from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useBudgets, useBudgetStatus, useDeleteBudget } from "../hooks/useFinance";
import type { Budget } from "../types/finance.types";
import { BudgetFormDialog } from "./BudgetFormDialog";

export function BudgetsTab() {
  const { data: budgets, isLoading, isError, error } = useBudgets();
  const [dialog, setDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<Budget | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(null);
            setDialog(true);
          }}
        >
          <Plus className="h-4 w-4" /> Tạo ngân sách
        </Button>
      </div>

      {isLoading && <div className="h-20 animate-pulse rounded-lg bg-muted" />}
      {isError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {extractApiErrorMessage(error)}
        </p>
      )}
      {!isLoading && !isError && budgets && budgets.length === 0 && (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Chưa có ngân sách nào.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {budgets?.map((b) => (
          <BudgetCard
            key={b.id}
            budget={b}
            onEdit={() => {
              setEditing(b);
              setDialog(true);
            }}
          />
        ))}
      </div>

      <BudgetFormDialog open={dialog} onOpenChange={setDialog} budget={editing} />
    </div>
  );
}

function BudgetCard({ budget, onEdit }: { budget: Budget; onEdit: () => void }) {
  const { data: status, isLoading } = useBudgetStatus(budget.id);
  const deleteMut = useDeleteBudget();
  const [err, setErr] = React.useState<string | null>(null);

  const pct = status && status.amount > 0 ? (status.actual / status.amount) * 100 : 0;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium">{budget.name}</span>
              <Badge variant="outline">{budget.category ?? "Tổng chi"}</Badge>
              <Badge variant="secondary">{budget.period}</Badge>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" title="Sửa" onClick={onEdit}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Xoá"
              disabled={deleteMut.isPending}
              onClick={async () => {
                setErr(null);
                try {
                  await deleteMut.mutateAsync(budget.id);
                } catch (e) {
                  setErr(extractApiErrorMessage(e));
                }
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="mt-3 h-2 animate-pulse rounded bg-muted" />
        ) : status ? (
          <div className="mt-3 space-y-1.5">
            <Progress
              value={pct}
              indicatorClassName={status.exceeded ? "bg-destructive" : undefined}
            />
            <div className="flex items-center justify-between text-xs">
              <span className={cn(status.exceeded && "font-medium text-destructive")}>
                Đã chi {formatCurrency(status.actual)} / {formatCurrency(status.amount)}
              </span>
              <span className={cn("text-muted-foreground", status.exceeded && "text-destructive")}>
                {status.exceeded ? "Vượt " : "Còn "}
                {formatCurrency(Math.abs(status.remaining))}
              </span>
            </div>
          </div>
        ) : null}
        {err && <p className="mt-2 text-xs text-destructive">{err}</p>}
      </CardContent>
    </Card>
  );
}
