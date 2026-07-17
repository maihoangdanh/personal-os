"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCompleteTask } from "@/features/tasks/hooks/useTasks";
import { STATUS_BADGE_VARIANT, STATUS_LABELS } from "@/features/tasks/lib/status";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useTodayTasks } from "../hooks/useTodayTasks";
import { HabitStreakWidget } from "./HabitStreakWidget";
import { UrgentImportantWidget } from "./UrgentImportantWidget";

export function DashboardView() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, error } = useTodayTasks();
  const completeMut = useCompleteTask();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">
          Chào {user?.name ?? "bạn"} 👋
        </h1>
        <p className="text-sm text-muted-foreground">
          Đây là những việc cần tập trung hôm nay.
        </p>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5 text-primary" /> Today&apos;s Tasks
          </CardTitle>
          <Link
            href="/tasks"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Xem tất cả <ArrowRight className="h-4 w-4" />
          </Link>
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
            <ul className="divide-y divide-border">
              {data.map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">{task.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
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

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <UrgentImportantWidget />
        <HabitStreakWidget />
      </div>
    </div>
  );
}
