"use client";

import * as React from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AiChatView } from "./AiChatView";
import { SummaryTab } from "./SummaryTab";
import { PlanTab } from "./PlanTab";
import { ForecastTab } from "./ForecastTab";

const TABS = [
  { key: "chat", label: "Chat" },
  { key: "summary", label: "Tổng kết" },
  { key: "plan", label: "Lịch gợi ý" },
  { key: "forecast", label: "Dự báo" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function AiView() {
  const [tab, setTab] = React.useState<TabKey>("chat");
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="TRỢ LÝ"
        title="AI Assistant"
        description="Chat trên dữ liệu cá nhân — AI chỉ gợi ý, không tự thay đổi dữ liệu."
      />

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

      {tab === "chat" && <AiChatView />}
      {tab === "summary" && <SummaryTab />}
      {tab === "plan" && <PlanTab />}
      {tab === "forecast" && <ForecastTab />}
    </div>
  );
}
