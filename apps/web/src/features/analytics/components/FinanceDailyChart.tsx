"use client";

import type { DailyFinanceReport } from "@/features/finance/types/finance.types";

function dayNumber(date: string): string {
  return date.slice(-2);
}

export function FinanceDailyChart({
  data,
  isLoading,
}: {
  data?: DailyFinanceReport;
  isLoading: boolean;
}) {
  if (isLoading) {
    return <div className="h-48 animate-pulse rounded-md bg-muted" />;
  }
  if (!data || data.days.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Chưa có dữ liệu.</p>;
  }

  const max = Math.max(1, ...data.days.map((d) => Math.max(d.income, d.expense)));

  return (
    <div>
      <div className="mb-2 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-success" /> Thu
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-sm bg-destructive" /> Chi
        </span>
      </div>
      <div className="flex h-48 items-stretch gap-[3px]">
        {data.days.map((d) => (
          <div
            key={d.date}
            className="flex min-w-[4px] flex-1 flex-col"
            title={`${d.date}: Thu ${d.income.toLocaleString("vi-VN")}₫ · Chi ${d.expense.toLocaleString("vi-VN")}₫`}
          >
            <div className="flex h-1/2 flex-col justify-end">
              <div
                className="rounded-t-sm bg-success"
                style={{ height: `${(d.income / max) * 100}%` }}
              />
            </div>
            <div className="h-px shrink-0 bg-border" />
            <div className="flex h-1/2 flex-col justify-start">
              <div
                className="rounded-b-sm bg-destructive"
                style={{ height: `${(d.expense / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>{dayNumber(data.days[0].date)}</span>
        <span>{dayNumber(data.days[data.days.length - 1].date)}</span>
      </div>
    </div>
  );
}
