"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CardLink } from "@/components/layout/CardLink";
import { cn } from "@/lib/utils";
import { formatDate, formatTime, isOverdue } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCompleteTask, useUpdateTask } from "@/features/tasks/hooks/useTasks";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { useAuthStore } from "@/features/auth/store/useAuthStore";
import { useTodayTasks } from "../hooks/useTodayTasks";
import { StatStrip } from "./StatStrip";
import { HabitStreakWidget } from "./HabitStreakWidget";
import { UrgentImportantWidget } from "./UrgentImportantWidget";
import { GoalProgressWidget } from "./GoalProgressWidget";
import { ProjectsProgressWidget } from "./ProjectsProgressWidget";
import { NetWorthWidget } from "./NetWorthWidget";
import { ReminderWidget } from "./ReminderWidget";

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

type Layout = "focus" | "grid" | "zen";
const LAYOUT_KEY = "dashboard-layout";

/**
 * grid-template-areas theo mockup (biến `grids` trong design/Personal OS.dc.html):
 * t=Hôm nay, u=Gấp&quan trọng, h=Thói quen, r=Nhắc nhở, g=Mục tiêu, p=Dự án, n=Tài sản ròng.
 */
const LAYOUTS: Record<Layout, React.CSSProperties> = {
  focus: {
    gridTemplateColumns: "1.65fr 1fr",
    gridTemplateAreas: '"t h" "t r" "u n" "g p"',
  },
  grid: {
    gridTemplateColumns: "1fr 1fr 1fr",
    gridTemplateAreas: '"t t h" "u n h" "g p r"',
  },
  zen: {
    gridTemplateColumns: "minmax(0, 720px)",
    justifyContent: "center",
    gridTemplateAreas: '"t" "u" "h" "r" "g" "p" "n"',
  },
};

const LAYOUT_OPTIONS: [Layout, string][] = [
  ["focus", "Tập trung"],
  ["grid", "Lưới"],
  ["zen", "Tối giản"],
];

export function DashboardView() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading, isError, error } = useTodayTasks();
  const completeMut = useCompleteTask();
  const updateMut = useUpdateTask();
  // Tái dùng cache Projects (React Query) để hiện TÊN PROJECT làm phụ đề dòng task — không thêm
  // API mới. Project "Inbox" là project mặc định (task chưa gán project cụ thể) → hiện "Cá nhân".
  const { data: projects } = useProjects();
  const projectLabelByProjectId = React.useMemo(() => {
    const m = new Map<string, string>();
    for (const p of projects ?? []) {
      m.set(p.id, p.title === "Inbox" ? "Cá nhân" : p.title);
    }
    return m;
  }, [projects]);

  const [layout, setLayout] = React.useState<Layout>("focus");

  // Đọc lựa chọn layout đã lưu (client-only, tránh hydration mismatch).
  React.useEffect(() => {
    const stored = window.localStorage.getItem(LAYOUT_KEY) as Layout | null;
    if (stored === "focus" || stored === "grid" || stored === "zen") {
      setLayout(stored);
    }
  }, []);

  function pickLayout(l: Layout) {
    setLayout(l);
    try {
      window.localStorage.setItem(LAYOUT_KEY, l);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-6">
      {/* Header eyebrow + greeting serif + layout switcher */}
      <div className="flex flex-wrap items-end justify-between gap-4">
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
        <div className="flex gap-1.5 rounded-xl border border-border bg-card p-1">
          {LAYOUT_OPTIONS.map(([key, label]) => {
            const active = layout === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => pickLayout(key)}
                className={
                  "rounded-lg px-3 py-1.5 text-[12.5px] font-semibold transition-colors " +
                  (active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      <StatStrip />

      {/* Lưới widget theo grid-template-areas; mobile stack (flex), lg mới thành grid. */}
      <div className="flex flex-col gap-5 lg:grid" style={LAYOUTS[layout]}>
        {/* t — Hôm nay (Today's Tasks) */}
        <div className="h-full" style={{ gridArea: "t" }}>
          <Card className="h-full">
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
                  {data.map((task) => {
                    const isDone = task.status === "DONE";
                    const overdue = isOverdue(task.deadline);
                    const projectLabel = projectLabelByProjectId.get(task.projectId) ?? "Cá nhân";
                    const toggleBusy = completeMut.isPending || updateMut.isPending;
                    return (
                      <li
                        key={task.id}
                        className="flex items-center gap-3 rounded-[10px] px-2 py-[11px] transition-colors hover:bg-secondary"
                      >
                        <button
                          type="button"
                          title={isDone ? "Bỏ hoàn thành" : "Hoàn thành"}
                          disabled={toggleBusy}
                          onClick={() =>
                            isDone
                              ? updateMut.mutate({ id: task.id, payload: { status: "TODO" } })
                              : completeMut.mutate(task.id)
                          }
                          className={cn(
                            "flex h-[21px] w-[21px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors",
                            isDone
                              ? "border-primary bg-primary"
                              : "border-border bg-transparent hover:border-primary",
                          )}
                        >
                          <Check
                            className={cn("h-3 w-3", isDone ? "text-primary-foreground" : "text-transparent")}
                            strokeWidth={3}
                          />
                        </button>
                        <div className="min-w-0 flex-1">
                          <div
                            className={cn(
                              "truncate text-[13.5px] font-medium",
                              isDone ? "text-muted-foreground line-through" : "text-foreground",
                            )}
                          >
                            {task.title}
                          </div>
                          <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
                            {projectLabel}
                            {overdue && ` · quá hạn từ ${formatDate(task.deadline)}`}
                          </div>
                        </div>
                        <div
                          className={cn(
                            "shrink-0 font-mono text-[11px]",
                            overdue ? "font-semibold text-destructive" : "text-muted-foreground",
                          )}
                        >
                          {overdue ? "QUÁ HẠN" : formatTime(task.deadline)}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* u — Gấp & quan trọng */}
        <div className="h-full [&>*]:h-full" style={{ gridArea: "u" }}>
          <UrgentImportantWidget />
        </div>
        {/* h — Thói quen */}
        <div className="h-full [&>*]:h-full" style={{ gridArea: "h" }}>
          <HabitStreakWidget />
        </div>
        {/* r — Nhắc nhở */}
        <div className="h-full [&>*]:h-full" style={{ gridArea: "r" }}>
          <ReminderWidget />
        </div>
        {/* g — Mục tiêu */}
        <div className="h-full [&>*]:h-full" style={{ gridArea: "g" }}>
          <GoalProgressWidget />
        </div>
        {/* p — Dự án */}
        <div className="h-full [&>*]:h-full" style={{ gridArea: "p" }}>
          <ProjectsProgressWidget />
        </div>
        {/* n — Tài sản ròng */}
        <div className="h-full [&>*]:h-full" style={{ gridArea: "n" }}>
          <NetWorthWidget />
        </div>
      </div>
    </div>
  );
}
