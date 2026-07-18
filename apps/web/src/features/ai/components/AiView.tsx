"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
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
      {tab === "chat" && <AiChatView />}
      {tab === "summary" && <SummaryTab />}
      {tab === "plan" && <PlanTab />}
      {tab === "forecast" && <ForecastTab />}
    </div>
  );
}
