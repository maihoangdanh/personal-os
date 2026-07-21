"use client";

import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardLink } from "@/components/layout/CardLink";
import { formatDateTime } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCompleteTask } from "@/features/tasks/hooks/useTasks";
import { STATUS_BADGE_VARIANT, STATUS_LABELS } from "@/features/tasks/lib/status";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useTodayTasks } from "../hooks/useTodayTasks";
import { StatStrip } from "./StatStrip";
import { HabitStreakWidget } from "./HabitStreakWidget";
import { UrgentImportantWidget } from "./UrgentImportantWidget";
import { GoalProgressWidget } from "./GoalProgressWidget";
import { ProjectsProgressWidget } from "./ProjectsProgressWidget";
import { NetWorthWidget } from "./NetWorthWidget";

function todayLine(): string {
  return new Date()
    .toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "long" })
    .toUpperCase();
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 11) return "Chào buổi sáng";
  if (h < 14) return "Chào buổi trưa";
  if (h < 18) return "Chào buổi chiều";
  return "Chào buổi tối";
}

export function DashboardView() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, error } = useTodayTasks();
  const completeMut = useCompleteTask();

  return (
    <div className="space-y-6">
      {/* Header eyebrow + greeting serif */}
      <div>
        <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">
          {todayLine()}
        </div>
        <h1 className="mt-1.5 font-serif text-[34px] font-semibold tracking-tight">
          {greeting()}, {user?.name ?? "bạn"}.
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Đây là những việc cần tập trung hôm nay.
        </p>
      </div>

      <StatStrip />

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-[15px] font-bold">Hôm nay</CardTitle>
          <CardLink href="/tasks">Xem tất cả →</CardLink>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          )}

          {isError && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              Không tải được: {extractApiErrorMessage(error)}
            </p>
          )}

          {!isLoading && !isError && data && data.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Không có task nào cho hôm nay. Thảnh thơi nhé! 🎉
            </p>
          )}

          {!isLoading && !isError && data && data.length > 0 && (
            <ul className="-mx-2 flex flex-col">
              {data.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 rounded-[10px] px-2 py-[11px] transition-colors hover:bg-secondary"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-medium">{task.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11.5px] text-muted-foreground">
                      <Badge variant={STATUS_BADGE_VARIANT[task.status]}>
                        {STATUS_LABELS[task.status]}
                      </Badge>
                      <span>
                        I{task.impact}·U{task.urgency}
                      </span>
                      <span>·</span>
                      <span>Deadline: {formatDateTime(task.deadline)}</span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Hoàn thành"
                    disabled={completeMut.isPending}
                    onClick={() => completeMut.mutate(task.id)}
                  >
                    <CheckCircle2 className="h-5 w-5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <UrgentImportantWidget />
        <HabitStreakWidget />
        <GoalProgressWidget />
        <ProjectsProgressWidget />
      </div>

      <NetWorthWidget />
    </div>
  );
}
