"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { WalletsTab } from "./WalletsTab";
import { TransactionsTab } from "./TransactionsTab";
import { BudgetsTab } from "./BudgetsTab";
import { InvestmentsTab } from "./InvestmentsTab";
import { AssetsTab } from "./AssetsTab";
import { ReportTab } from "./ReportTab";
import { TransactionFormDialog } from "./TransactionFormDialog";

const TABS = [
  { key: "report", label: "Tổng quan" },
  { key: "wallets", label: "Ví" },
  { key: "transactions", label: "Giao dịch" },
  { key: "budgets", label: "Ngân sách" },
  { key: "investments", label: "Đầu tư" },
  { key: "assets", label: "Tài sản" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function monthEyebrow(): string {
  const d = new Date();
  return `TÀI CHÍNH · THÁNG ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

export function FinanceView() {
  const [tab, setTab] = React.useState<TabKey>("report");
  const [txDialog, setTxDialog] = React.useState(false);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={monthEyebrow()}
        title="Finance"
        description="Ví, giao dịch, ngân sách và tài sản."
        actions={
          <Button onClick={() => setTxDialog(true)}>
            <Plus className="h-4 w-4" /> Ghi giao dịch
          </Button>
        }
      />

      {/* Tab pill toggle */}
      <div className="flex w-fit flex-wrap gap-1.5 rounded-xl border border-border bg-card p-1">
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                "rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-colors " +
                (active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "report" && <ReportTab goToTab={setTab} />}
      {tab === "wallets" && <WalletsTab />}
      {tab === "transactions" && <TransactionsTab />}
      {tab === "budgets" && <BudgetsTab />}
      {tab === "investments" && <InvestmentsTab />}
      {tab === "assets" && <AssetsTab />}

      <TransactionFormDialog open={txDialog} onOpenChange={setTxDialog} transaction={null} />
    </div>
  );
}
