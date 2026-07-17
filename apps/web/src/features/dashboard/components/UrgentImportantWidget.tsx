"use client";

import Link from "next/link";
import { ArrowRight, Flame } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useTaskList } from "@/features/tasks/hooks/useTasks";
import { groupByQuadrant } from "@/features/tasks/lib/eisenhower";

/**
 * Urgent & Important panel.
 * Tái dùng logic phân loại Eisenhower (`groupByQuadrant`) + hook `useTaskList` đã có — KHÔNG tạo
 * hook mới. Lấy đúng ô "Do Now" (impact cao + urgency cao) trong số task đang mở
 * (groupByQuadrant đã tự loại DONE/ARCHIVED). Chỉ hiển thị title + link nhanh tới /tasks.
 */
export function UrgentImportantWidget() {
  const { data, isLoading, isError, error } = useTaskList({
    page: 1,
    pageSize: 100,
    sortBy: "priorityScore",
    sortOrder: "desc",
  });

  const doNow = data ? groupByQuadrant(data.items).DO_NOW : [];

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-destructive" /> Urgent &amp; Important
        </CardTitle>
        <Link
          href="/tasks"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Mở Tasks <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        )}

        {isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Không tải được: {extractApiErrorMessage(error)}
          </p>
        )}

        {!isLoading && !isError && doNow.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Không có việc vừa quan trọng vừa khẩn cấp. Tốt! 👍
          </p>
        )}

        {!isLoading && !isError && doNow.length > 0 && (
          <ul className="space-y-1.5">
            {doNow.map((task) => (
              <li key={task.id}>
                <Link
                  href="/tasks"
                  className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                >
                  <span aria-hidden>🔥</span>
                  <span className="truncate">{task.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    I{task.impact}·U{task.urgency}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
