"use client";

import * as React from "react";
import { CalendarClock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api-client";
import { usePlanSchedule } from "../hooks/useAi";

export function PlanTab() {
  const [horizon, setHorizon] = React.useState(3);
  const planMut = usePlanSchedule();
  const [error, setError] = React.useState<string | null>(null);

  async function generate() {
    setError(null);
    try {
      await planMut.mutateAsync({ horizonDays: horizon });
    } catch (e) {
      setError(extractApiErrorMessage(e, "Không tạo được gợi ý lịch (AI router có thể bận)"));
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        AI gợi ý sắp xếp các task có deadline vào khung giờ trống. Đây chỉ là gợi ý — không tự thêm
        vào lịch của bạn.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Số ngày</label>
          <Select className="w-32" value={horizon} onChange={(e) => setHorizon(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>
                {n} ngày
              </option>
            ))}
          </Select>
        </div>
        <Button onClick={generate} disabled={planMut.isPending}>
          <Sparkles className="h-4 w-4" />
          {planMut.isPending ? "AI đang sắp lịch..." : "Gợi ý lịch làm việc"}
        </Button>
      </div>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {planMut.data && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <CalendarClock className="h-4 w-4 text-primary" /> Gợi ý sắp xếp
            </div>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">{planMut.data.plan}</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
