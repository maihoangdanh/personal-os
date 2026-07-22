"use client";

import Link from "next/link";
import { ArrowRight, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useNetWorth } from "@/features/finance/hooks/useFinance";

/** "2026-06" → "06" (chỉ phần tháng, để hiện "so với tháng 06"). Fallback: nguyên chuỗi. */
function monthLabel(month: string): string {
  const parts = month.split("-");
  return parts.length === 2 ? parts[1] : month;
}

/**
 * Net Worth widget (tóm tắt số liệu). Tái dùng useNetWorth (Phase 3).
 * Số do backend tính sẵn (Σ ví + đầu tư + tài sản) — chỉ hiển thị.
 * Badge % (changePercent) + mini bar chart (history) do backend cấp thêm (_workspace/29).
 */
export function NetWorthWidget() {
  const { data, isLoading, isError, error } = useNetWorth();

  const changePercent = data?.changePercent;
  const hasChange = changePercent !== null && changePercent !== undefined;
  const isUp = hasChange && changePercent >= 0;

  const history = data?.history ?? [];
  const maxNetWorth = history.reduce((m, h) => Math.max(m, h.netWorth), 0);

  const breakdown = [
    { label: "Ví", value: data?.walletTotal },
    { label: "Đầu tư", value: data?.investmentTotal },
    { label: "Tài sản", value: data?.assetTotal },
  ];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" /> Tài sản ròng
        </CardTitle>
        <Link
          href="/finance"
          className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.06em] text-primary transition-colors hover:text-accent-2"
        >
          Chi tiết <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="h-32 animate-pulse rounded-md bg-muted" />}
        {isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {extractApiErrorMessage(error)}
          </p>
        )}
        {!isLoading && !isError && data && (
          <div className="space-y-3.5">
            {/* Số tiền lớn + badge % thay đổi */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="font-serif text-[26px] font-semibold leading-none">
                {formatCurrency(data.netWorth)}
              </span>
              {hasChange && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-medium ${
                    isUp ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                  }`}
                >
                  {isUp ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {isUp ? "+" : ""}
                  {changePercent}%
                  {data.previousMonth && (
                    <span className="opacity-80">so với tháng {monthLabel(data.previousMonth.month)}</span>
                  )}
                </span>
              )}
            </div>

            {/* Mini bar chart từ history — render đúng số cột có (1..12), KHÔNG pad */}
            {history.length > 0 && (
              <div className="flex h-14 items-end gap-1" aria-hidden>
                {history.map((h, i) => {
                  const isCurrent = i === history.length - 1;
                  // scale theo max; cột thấp nhất vẫn có 6% để không biến mất hẳn.
                  const pct = maxNetWorth > 0 ? Math.max((h.netWorth / maxNetWorth) * 100, 6) : 6;
                  return (
                    <div
                      key={h.month}
                      title={`${h.month}: ${formatCurrency(h.netWorth)}`}
                      className={`min-w-[6px] flex-1 rounded-t-sm ${
                        isCurrent ? "bg-primary" : "bg-muted-foreground/25"
                      }`}
                      style={{ height: `${pct}%` }}
                    />
                  );
                })}
              </div>
            )}

            {/* Breakdown Ví / Đầu tư / Tài sản — nhãn muted, số căn phải cùng hàng */}
            <div className="space-y-1.5 border-t border-border pt-3">
              {breakdown.map((b) => (
                <div key={b.label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{b.label}</span>
                  <span className="font-medium tabular-nums">{formatCurrency(b.value ?? 0)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
