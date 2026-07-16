"use client";

import * as React from "react";
import { CheckCircle2, Pencil, Play, Square, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useCompleteTask,
  useDeleteTask,
  useStartTimer,
  useStopTimer,
  useUpdateTask,
} from "../hooks/useTasks";
import { STATUS_BADGE_VARIANT, STATUS_LABELS } from "../lib/status";
import { TASK_STATUSES, type Task } from "../types/task.types";

interface TaskListViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
}

export function TaskListView({ tasks, onEdit }: TaskListViewProps) {
  const [actionError, setActionError] = React.useState<string | null>(null);

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Chưa có task nào. Nhấn <span className="font-medium">Tạo Task</span> để bắt đầu.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Task</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Impact×Urgency</th>
              <th className="px-3 py-2 font-medium">Deadline</th>
              <th className="px-3 py-2 text-right font-medium">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                onEdit={onEdit}
                onError={setActionError}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TaskRow({
  task,
  onEdit,
  onError,
}: {
  task: Task;
  onEdit: (task: Task) => void;
  onError: (msg: string | null) => void;
}) {
  const updateMut = useUpdateTask();
  const deleteMut = useDeleteTask();
  const completeMut = useCompleteTask();
  const startMut = useStartTimer();
  const stopMut = useStopTimer();

  const busy =
    updateMut.isPending ||
    deleteMut.isPending ||
    completeMut.isPending ||
    startMut.isPending ||
    stopMut.isPending;

  async function run(fn: () => Promise<unknown>) {
    onError(null);
    try {
      await fn();
    } catch (err) {
      onError(extractApiErrorMessage(err));
    }
  }

  const isDone = task.status === "DONE";

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-3 py-2">
        <div className="font-medium text-foreground">{task.title}</div>
        {task.description && (
          <div className="line-clamp-1 text-xs text-muted-foreground">
            {task.description}
          </div>
        )}
      </td>
      <td className="px-3 py-2">
        {/* Đổi status tự do (backend không enforce transition graph). */}
        <Select
          className="h-8 w-32 text-xs"
          value={task.status}
          disabled={busy}
          onChange={(e) =>
            run(() =>
              updateMut.mutateAsync({
                id: task.id,
                payload: { status: e.target.value as Task["status"] },
              }),
            )
          }
        >
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </Select>
      </td>
      <td className="px-3 py-2">
        <Badge variant={STATUS_BADGE_VARIANT[task.status]}>
          {task.impact} × {task.urgency} = {task.priorityScore ?? task.impact * task.urgency}
        </Badge>
      </td>
      <td className="px-3 py-2 text-muted-foreground">
        {formatDateTime(task.deadline)}
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center justify-end gap-1">
          {/* Một nút toggle: hiện trạng thái từ task.isTimerRunning (đọc thẳng từ response
              list/detail). Bấm → gọi đúng start/stop; hook invalidate tasks nên list refetch
              lấy isTimerRunning mới nhất. */}
          {task.isTimerRunning ? (
            <Button
              variant="ghost"
              size="icon"
              title="Dừng timer (đang chạy)"
              disabled={busy}
              onClick={() => run(() => stopMut.mutateAsync(task.id))}
            >
              <Square className="h-4 w-4 text-destructive" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              title="Bắt đầu timer"
              disabled={busy}
              onClick={() => run(() => startMut.mutateAsync(task.id))}
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            title="Hoàn thành"
            disabled={busy || isDone}
            onClick={() => run(() => completeMut.mutateAsync(task.id))}
          >
            <CheckCircle2
              className={isDone ? "h-4 w-4 text-success" : "h-4 w-4"}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Sửa"
            disabled={busy}
            onClick={() => onEdit(task)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Xoá (soft delete)"
            disabled={busy}
            onClick={() => run(() => deleteMut.mutateAsync(task.id))}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </td>
    </tr>
  );
}
