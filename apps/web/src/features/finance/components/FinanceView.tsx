"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { WalletsTab } from "./WalletsTab";
import { TransactionsTab } from "./TransactionsTab";
import { BudgetsTab } from "./BudgetsTab";
import { InvestmentsTab } from "./InvestmentsTab";
import { AssetsTab } from "./AssetsTab";
import { ReportTab } from "./ReportTab";

const TABS = [
  { key: "report", label: "Tổng quan" },
  { key: "wallets", label: "Ví" },
  { key: "transactions", label: "Giao dịch" },
  { key: "budgets", label: "Ngân sách" },
  { key: "investments", label: "Đầu tư" },
  { key: "assets", label: "Tài sản" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function FinanceView() {
  const [tab, setTab] = React.useState<TabKey>("report");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              tab === t.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "report" && <ReportTab />}
      {tab === "wallets" && <WalletsTab />}
      {tab === "transactions" && <TransactionsTab />}
      {tab === "budgets" && <BudgetsTab />}
      {tab === "investments" && <InvestmentsTab />}
      {tab === "assets" && <AssetsTab />}
    </div>
  );
}
