"use client";

import * as React from "react";
import { Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useForecast } from "../hooks/useAi";

export function ForecastTab() {
  const forecastMut = useForecast();
  const [error, setError] = React.useState<string | null>(null);

  async function generate() {
    setError(null);
    try {
      await forecastMut.mutateAsync();
    } catch (e) {
      setError(extractApiErrorMessage(e, "Không tạo được dự báo (AI router có thể bận)"));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        AI dự báo tiến độ Goal/KPI và xu hướng tài chính dựa trên số liệu thật. Chỉ diễn giải, không
        thay đổi dữ liệu. Nếu chưa đủ dữ liệu, AI sẽ nói rõ.
      </p>
      <Button onClick={generate} disabled={forecastMut.isPending}>
        <Sparkles className="h-4 w-4" />
        {forecastMut.isPending ? "AI đang dự báo..." : "Dự báo AI"}
      </Button>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {forecastMut.data && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <TrendingUp className="h-4 w-4 text-primary" /> Dự báo
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {forecastMut.data.narrative}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
