"use client";

import Link from "next/link";
import { ArrowRight, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useNetWorth } from "@/features/finance/hooks/useFinance";

/**
 * Net Worth widget (tóm tắt số liệu). Tái dùng useNetWorth (Phase 3).
 * Số do backend tính sẵn (Σ ví + đầu tư + tài sản) — chỉ hiển thị.
 */
export function NetWorthWidget() {
  const { data, isLoading, isError, error } = useNetWorth();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5 text-primary" /> Net Worth
        </CardTitle>
        <Link
          href="/finance"
          className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.06em] text-primary transition-colors hover:text-accent-2"
        >
          Chi tiết <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading && <div className="h-14 animate-pulse rounded-md bg-muted" />}
        {isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {extractApiErrorMessage(error)}
          </p>
        )}
        {!isLoading && !isError && data && (
          <div className="space-y-2">
            <div className="text-2xl font-bold">{formatCurrency(data.netWorth)}</div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Ví: {formatCurrency(data.walletTotal)}</span>
              <span>Đầu tư: {formatCurrency(data.investmentTotal)}</span>
              <span>Tài sản: {formatCurrency(data.assetTotal)}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
