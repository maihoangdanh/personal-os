"use client";

import * as React from "react";
import { FileText, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useGenerateSummary, useSummaries } from "../hooks/useAi";
import { SUMMARY_TYPES, type SummaryType } from "../types/ai.types";

const TYPE_LABELS: Record<SummaryType, string> = {
  DAILY: "Ngày",
  WEEKLY: "Tuần",
  MONTHLY: "Tháng",
};

export function SummaryTab() {
  const [type, setType] = React.useState<SummaryType>("DAILY");
  const { data: summaries, isLoading } = useSummaries();
  const genMut = useGenerateSummary();
  const [error, setError] = React.useState<string | null>(null);

  async function generate() {
    setError(null);
    try {
      await genMut.mutateAsync({ type });
    } catch (e) {
      setError(extractApiErrorMessage(e, "Không tạo được tổng kết (AI router có thể bận)"));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Kỳ tổng kết</label>
          <Select className="w-40" value={type} onChange={(e) => setType(e.target.value as SummaryType)}>
            {SUMMARY_TYPES.map((t) => (
              <option key={t} value={t}>
                {TYPE_LABELS[t]}
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={generate} disabled={genMut.isPending}>
          <Sparkles className="h-4 w-4" />
          {genMut.isPending ? "AI đang viết..." : "Tạo tổng kết"}
        </Button>
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {genMut.data && <SummaryCard summary={genMut.data} highlight />}

      <div>
        <h3 className="mb-2 text-sm font-medium text-muted-foreground">Tổng kết đã tạo</h3>
        {isLoading && <div className="h-16 animate-pulse rounded-lg bg-muted" />}
        {!isLoading && summaries && summaries.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có tổng kết nào.</p>
        )}
        <div className="space-y-3">
          {summaries
            ?.filter((s) => s.id !== genMut.data?.id)
            .map((s) => <SummaryCard key={s.id} summary={s} />)}
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  summary,
  highlight,
}: {
  summary: import("../types/ai.types").AiSummary;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-primary/40" : undefined}>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <FileText className="h-4 w-4 text-primary" />
          Tổng kết {TYPE_LABELS[summary.type]}
          <Badge variant="secondary">
            {summary.periodStart}
            {summary.periodEnd !== summary.periodStart ? ` → ${summary.periodEnd}` : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{summary.content}</div>
      </CardContent>
    </Card>
  );
}
