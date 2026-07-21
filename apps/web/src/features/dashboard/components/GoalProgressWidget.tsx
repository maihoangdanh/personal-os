"use client";

import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useGoals } from "@/features/goals/hooks/useGoals";

/**
 * Goal Progress widget — Goal đang ACTIVE + progress bar.
 * Tái dùng useGoals (Phase 2). Dùng `goal.progress` INLINE từ GET /goals (đã có trong list
 * response) → KHÔNG gọi /goals/{id}/progress cho từng item (tránh N+1, giống trang Goal Tree).
 */
export function GoalProgressWidget() {
  const { data: goals, isLoading, isError, error } = useGoals({ status: "ACTIVE" });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" /> Goal Progress
        </CardTitle>
        <Link
          href="/goals"
          className="flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.06em] text-primary transition-colors hover:text-accent-2"
        >
          Xem tất cả <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        )}

        {isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Không tải được goal: {extractApiErrorMessage(error)}
          </p>
        )}

        {!isLoading && !isError && goals && goals.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Chưa có goal ACTIVE nào. Đặt một mục tiêu để theo dõi tiến độ.
          </p>
        )}

        {!isLoading && !isError && goals && goals.length > 0 && (
          <ul className="space-y-3">
            {goals.map((goal) => (
              <li key={goal.id}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="truncate font-medium">{goal.title}</span>
                  <Badge variant="outline">{goal.progress}%</Badge>
                </div>
                <div className="flex items-center gap-3">
                  <Progress value={goal.progress} className="flex-1" />
                  <span className="w-24 shrink-0 text-right text-xs text-muted-foreground">
                    {goal.currentValue}
                    {goal.targetValue != null ? ` / ${goal.targetValue}` : ""}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
