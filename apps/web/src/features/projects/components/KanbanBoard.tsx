"use client";

import * as React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useTaskList, useUpdateTask } from "@/features/tasks/hooks/useTasks";
import { STATUS_LABELS } from "@/features/tasks/lib/status";
import { TASK_STATUSES, type Task, type TaskStatus } from "@/features/tasks/types/task.types";

/**
 * Kanban 6 cột theo TaskStatus. Kéo-thả đổi status → PATCH /tasks/{id} (không có state-machine
 * cứng, kéo cột nào cũng được — đúng thiết kế backend). Sau khi đổi, invalidate tasks + projects +
 * milestones để Project.progress / Milestone.isCompleted (backend rollup) hiển thị lại đúng.
 */
export function KanbanBoard({ projectId }: { projectId: string }) {
  const { data, isLoading, isError, error } = useTaskList({
    projectId,
    pageSize: 100,
    sortBy: "priorityScore",
    sortOrder: "desc",
  });
  const updateMut = useUpdateTask();
  const qc = useQueryClient();
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [actionError, setActionError] = React.useState<string | null>(null);

  const tasks = data?.items ?? [];
  const columns = React.useMemo(() => {
    const map: Record<TaskStatus, Task[]> = {
      INBOX: [], TODO: [], DOING: [], REVIEW: [], DONE: [], ARCHIVED: [],
    };
    for (const t of tasks) map[t.status].push(t);
    return map;
  }, [tasks]);

  async function moveTo(taskId: string, status: TaskStatus, current: TaskStatus) {
    if (status === current) return;
    setActionError(null);
    try {
      await updateMut.mutateAsync({ id: taskId, payload: { status } });
      // Rollup: refetch project progress + milestone completion.
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["milestones"] });
    } catch (e) {
      setActionError(extractApiErrorMessage(e));
    }
  }

  if (isLoading) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  if (isError)
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {extractApiErrorMessage(error)}
      </p>
    );

  return (
    <div className="space-y-2">
      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{actionError}</p>
      )}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {TASK_STATUSES.map((status) => (
          <div
            key={status}
            className="flex min-h-[120px] flex-col rounded-lg border border-border bg-muted/30 p-2"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const id = e.dataTransfer.getData("text/plain") || dragId;
              const task = tasks.find((t) => t.id === id);
              if (task) moveTo(task.id, status, task.status);
              setDragId(null);
            }}
          >
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {STATUS_LABELS[status]}
              </span>
              <Badge variant="outline">{columns[status].length}</Badge>
            </div>
            <div className="flex flex-1 flex-col gap-2">
              {columns[status].map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", task.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDragId(task.id);
                  }}
                  onDragEnd={() => setDragId(null)}
                  className="cursor-grab rounded-md border border-border bg-card p-2 text-sm shadow-sm active:cursor-grabbing"
                >
                  <div className="font-medium">{task.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    I{task.impact}·U{task.urgency}
                    {task.priorityScore != null ? ` · ${task.priorityScore}đ` : ""}
                  </div>
                </div>
              ))}
              {columns[status].length === 0 && (
                <div className="rounded-md border border-dashed border-border py-4 text-center text-[11px] text-muted-foreground">
                  Kéo task vào đây
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
