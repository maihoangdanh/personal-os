"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useFinanceReport, useNetWorth } from "../hooks/useFinance";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function ReportTab() {
  const [month, setMonth] = React.useState(currentMonth());
  const report = useFinanceReport(month);
  const netWorth = useNetWorth();

  return (
    <div className="space-y-6">
      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="r-month">Tháng</Label>
          <Input
            id="r-month"
            type="month"
            className="w-44"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
      </div>

      {report.isError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {extractApiErrorMessage(report.error)}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Thu (Income)" value={report.data?.income} loading={report.isLoading} tone="success" />
        <StatCard label="Chi (Expense)" value={report.data?.expense} loading={report.isLoading} tone="danger" />
        <StatCard label="Lợi nhuận (Profit)" value={report.data?.profit} loading={report.isLoading} tone="auto" />
        <Card>
          <CardContent className="p-4">
            <div className="text-xs text-muted-foreground">Saving Rate</div>
            {report.isLoading ? (
              <div className="mt-2 h-6 w-20 animate-pulse rounded bg-muted" />
            ) : (
              <div className="mt-1 text-xl font-semibold">
                {report.data ? `${report.data.savingRatePercent.toFixed(1)}%` : "—"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Net Worth</CardTitle>
        </CardHeader>
        <CardContent>
          {netWorth.isError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {extractApiErrorMessage(netWorth.error)}
            </p>
          )}
          {netWorth.isLoading ? (
            <div className="h-16 animate-pulse rounded bg-muted" />
          ) : netWorth.data ? (
            <div className="space-y-3">
              <div className="text-3xl font-bold">{formatCurrency(netWorth.data.netWorth)}</div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <Breakdown label="Ví" value={netWorth.data.walletTotal} />
                <Breakdown label="Đầu tư" value={netWorth.data.investmentTotal} />
                <Breakdown label="Tài sản" value={netWorth.data.assetTotal} />
              </div>
              <p className="text-xs text-muted-foreground">
                Net Worth = tổng số dư ví + giá trị đầu tư hiện tại + giá trị tài sản (chưa trừ nợ).
              </p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  loading,
  tone,
}: {
  label: string;
  value: number | undefined;
  loading: boolean;
  tone: "success" | "danger" | "auto";
}) {
  const color =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-destructive"
        : value != null && value < 0
          ? "text-destructive"
          : "text-foreground";
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        {loading ? (
          <div className="mt-2 h-6 w-24 animate-pulse rounded bg-muted" />
        ) : (
          <div className={cn("mt-1 text-xl font-semibold", color)}>
            {value != null ? formatCurrency(value) : "—"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Breakdown({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border p-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 font-medium">{formatCurrency(value)}</div>
    </div>
  );
}
