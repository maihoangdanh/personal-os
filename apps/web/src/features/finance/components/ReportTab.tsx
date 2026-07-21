"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useBudgets,
  useBudgetStatus,
  useFinanceReport,
  useNetWorth,
  useTransactions,
  useWallets,
} from "../hooks/useFinance";
import type { Budget, Transaction } from "../types/finance.types";

type FinanceTabKey =
  | "report"
  | "wallets"
  | "transactions"
  | "budgets"
  | "investments"
  | "assets";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Dịch "YYYY-MM" tới/lui theo số tháng. */
function shiftMonth(m: string, dir: 1 | -1): string {
  const [y, mo] = m.split("-").map(Number);
  const d = new Date(y, mo - 1 + dir, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Nhãn "Tháng M, YYYY" từ "YYYY-MM". */
function monthLabel(m: string): string {
  const [y, mo] = m.split("-").map(Number);
  return `Tháng ${mo}, ${y}`;
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const DOT_COLORS = ["bg-accent-2", "bg-primary", "bg-warning"];

export function ReportTab({ goToTab }: { goToTab?: (t: FinanceTabKey) => void }) {
  const [month, setMonth] = React.useState(() => currentMonth());
  const report = useFinanceReport(month);
  const netWorth = useNetWorth();
  const isCurrent = month === currentMonth();

  const stats = [
    {
      label: "Thu nhập",
      value: report.data ? formatCurrency(report.data.income) : "—",
      sub: "Tổng thu tháng này",
      color: "text-success",
    },
    {
      label: "Chi tiêu",
      value: report.data ? formatCurrency(report.data.expense) : "—",
      sub: "Tổng chi tháng này",
      color: "text-destructive",
    },
    {
      label: "Còn lại",
      value: report.data ? formatCurrency(report.data.profit) : "—",
      sub: "Thu − chi",
      color: "text-foreground",
    },
    {
      label: "Tỷ lệ tiết kiệm",
      value: report.data ? `${report.data.savingRatePercent.toFixed(1)}%` : "—",
      sub: "Phần thu giữ lại",
      color: "text-accent-2",
    },
  ];

  return (
    <div className="space-y-4">
      {/* Điều hướng tháng — giữ khả năng xem báo cáo tháng khác */}
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMonth((m) => shiftMonth(m, -1))}
          title="Tháng trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="min-w-[130px] text-center font-mono text-[12.5px] font-semibold tracking-[0.04em]">
          {monthLabel(month)}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMonth((m) => shiftMonth(m, 1))}
          disabled={isCurrent}
          title="Tháng sau"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isCurrent && (
          <Button variant="outline" size="sm" onClick={() => setMonth(currentMonth())}>
            Tháng này
          </Button>
        )}
      </div>

      {report.isError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {extractApiErrorMessage(report.error)}
        </p>
      )}

      {/* Stat strip 4 ô */}
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-[14px] border border-border bg-card p-4 shadow-card">
            <div className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-muted-foreground">
              {s.label}
            </div>
            {report.isLoading ? (
              <div className="mt-2 h-6 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <div className={"mt-1.5 font-serif text-[23px] font-semibold " + s.color}>{s.value}</div>
            )}
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* 2 cột: 1.4fr (Net Worth + Giao dịch) | 1fr (Ví + Ngân sách) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="flex flex-col gap-4">
          {/* Net Worth */}
          <div className="rounded-lg border border-border bg-card p-6 shadow-card">
            <div className="mb-2 text-[15px] font-bold">Tài sản ròng</div>
            {netWorth.isError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {extractApiErrorMessage(netWorth.error)}
              </p>
            )}
            {netWorth.isLoading ? (
              <div className="h-24 animate-pulse rounded bg-muted" />
            ) : netWorth.data ? (
              <>
                <div className="font-serif text-[34px] font-bold tracking-tight">
                  {formatCurrency(netWorth.data.netWorth)}
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  <NwBreakdown
                    label="Ví"
                    value={netWorth.data.walletTotal}
                    total={netWorth.data.netWorth}
                    color="bg-warning"
                  />
                  <NwBreakdown
                    label="Đầu tư"
                    value={netWorth.data.investmentTotal}
                    total={netWorth.data.netWorth}
                    color="bg-accent-2"
                  />
                  <NwBreakdown
                    label="Tài sản"
                    value={netWorth.data.assetTotal}
                    total={netWorth.data.netWorth}
                    color="bg-primary"
                  />
                </div>
                <p className="mt-3.5 text-[11px] text-muted-foreground">
                  Tài sản ròng = số dư ví + giá trị đầu tư + giá trị tài sản (chưa trừ nợ).
                </p>
              </>
            ) : null}
          </div>

          {/* Giao dịch gần đây */}
          <RecentTransactions onSeeAll={() => goToTab?.("transactions")} />
        </div>

        <div className="flex flex-col gap-4">
          <WalletsSummary onSeeAll={() => goToTab?.("wallets")} />
          <BudgetsSummary onSeeAll={() => goToTab?.("budgets")} />
        </div>
      </div>
    </div>
  );
}

function NwBreakdown({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  return (
    <div className="rounded-xl bg-secondary p-3.5">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1.5 text-[15px] font-bold">{formatCurrency(value)}</div>
      <div className="mt-2 h-1 overflow-hidden rounded-full bg-border">
        <div className={"h-full " + color} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function CardShell({
  title,
  onSeeAll,
  children,
}: {
  title: string;
  onSeeAll?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-6 shadow-card">
      <div className="mb-3.5 flex items-center justify-between">
        <div className="text-[15px] font-bold">{title}</div>
        {onSeeAll && (
          <button
            type="button"
            onClick={onSeeAll}
            className="font-mono text-[11px] tracking-[0.06em] text-primary hover:underline"
          >
            TẤT CẢ →
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function RecentTransactions({ onSeeAll }: { onSeeAll?: () => void }) {
  const { data: txs, isLoading } = useTransactions();
  const { data: wallets } = useWallets();

  const recent = React.useMemo(() => {
    if (!txs) return [];
    return [...txs]
      .sort(
        (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime(),
      )
      .slice(0, 8);
  }, [txs]);

  return (
    <CardShell title="Giao dịch gần đây" onSeeAll={onSeeAll}>
      {isLoading ? (
        <div className="h-24 animate-pulse rounded bg-muted" />
      ) : recent.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">Chưa có giao dịch nào.</p>
      ) : (
        <div className="flex flex-col">
          {recent.map((t) => (
            <TxRow key={t.id} tx={t} walletName={wallets?.find((w) => w.id === t.walletId)?.name} />
          ))}
        </div>
      )}
    </CardShell>
  );
}

function TxRow({ tx, walletName }: { tx: Transaction; walletName?: string }) {
  const income = tx.type === "INCOME";
  const glyph = income ? "₫" : (tx.category ?? "—").slice(0, 2).toUpperCase();
  const name = tx.description || tx.category || (income ? "Thu nhập" : "Chi tiêu");
  const cat = tx.category ?? (income ? "Thu nhập" : "Chi tiêu");
  return (
    <div className="-mx-2 flex items-center gap-3 rounded-[10px] px-2 py-2.5 hover:bg-secondary">
      <div
        className={
          "flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] font-mono text-[12px] font-semibold " +
          (income ? "bg-success/[0.12] text-success" : "bg-secondary text-muted-foreground")
        }
      >
        {glyph}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[13px] font-medium">{name}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">
          {cat}
          {walletName ? ` · ${walletName}` : ""} · {shortDate(tx.transactionDate)}
        </div>
      </div>
      <div
        className={
          "shrink-0 font-mono text-[12.5px] font-semibold " +
          (income ? "text-success" : "text-foreground")
        }
      >
        {income ? "+" : "−"}
        {formatCurrency(tx.amount)}
      </div>
    </div>
  );
}

function WalletsSummary({ onSeeAll }: { onSeeAll?: () => void }) {
  const { data: wallets, isLoading } = useWallets();
  return (
    <CardShell title="Ví" onSeeAll={onSeeAll}>
      {isLoading ? (
        <div className="h-16 animate-pulse rounded bg-muted" />
      ) : !wallets || wallets.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">Chưa có ví nào.</p>
      ) : (
        <div className="flex flex-col gap-2.5">
          {wallets.map((w, i) => (
            <div
              key={w.id}
              className="flex items-center gap-3 rounded-xl bg-secondary px-3.5 py-3"
            >
              <div className={"h-2.5 w-2.5 shrink-0 rounded-full " + DOT_COLORS[i % DOT_COLORS.length]} />
              <div className="flex-1 text-[13px] font-medium">{w.name}</div>
              <div className="font-mono text-[12.5px] font-semibold">{formatCurrency(w.balance)}</div>
            </div>
          ))}
        </div>
      )}
    </CardShell>
  );
}

function BudgetsSummary({ onSeeAll }: { onSeeAll?: () => void }) {
  const { data: budgets, isLoading } = useBudgets();
  return (
    <CardShell title="Ngân sách" onSeeAll={onSeeAll}>
      {isLoading ? (
        <div className="h-16 animate-pulse rounded bg-muted" />
      ) : !budgets || budgets.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">Chưa có ngân sách nào.</p>
      ) : (
        <div className="flex flex-col gap-3.5">
          {budgets.map((b) => (
            <BudgetRow key={b.id} budget={b} />
          ))}
        </div>
      )}
    </CardShell>
  );
}

function BudgetRow({ budget }: { budget: Budget }) {
  const { data: status } = useBudgetStatus(budget.id);
  const pct =
    status && status.amount > 0 ? Math.min(100, (status.actual / status.amount) * 100) : 0;
  const exceeded = status?.exceeded ?? false;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <div className="text-[13px] font-medium">{budget.name}</div>
        <div
          className={
            "font-mono text-[10.5px] " + (exceeded ? "text-destructive" : "text-muted-foreground")
          }
        >
          {status
            ? `${formatCurrency(status.actual)} / ${formatCurrency(status.amount)}${exceeded ? " · vượt" : ""}`
            : "—"}
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
        <div
          className={"h-full rounded-full " + (exceeded ? "bg-destructive" : "bg-accent-2")}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
