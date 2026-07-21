"use client";

import * as React from "react";
import { CheckCircle2, Pencil, Play, Square, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useProjects } from "@/features/projects/hooks/useProjects";
import { PriorityStars } from "./PriorityStars";
import {
  useCompleteTask,
  useDeleteTask,
  useStartTimer,
  useStopTimer,
  useUpdateTask,
} from "../hooks/useTasks";
import { STATUS_LABELS } from "../lib/status";
import { TASK_STATUSES, type Task } from "../types/task.types";

interface TaskListViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
}

/** Tên project mặc định (backend tạo lúc register — _workspace/02_backend_auth-task.md). */
const INBOX_PROJECT_NAME = "Inbox";
/** Nhãn hiển thị cho nhóm task ở Inbox (task chưa gắn project cụ thể). */
const INBOX_GROUP_LABEL = "Việc lẻ";

interface TaskGroup {
  key: string;
  name: string;
  isInbox: boolean;
  tasks: Task[];
}

export function TaskListView({ tasks, onEdit }: TaskListViewProps) {
  const [actionError, setActionError] = React.useState<string | null>(null);
  // Reuse Projects list (React Query cache) để map projectId → tên project. KHÔNG API mới.
  const { data: projects } = useProjects();

  const groups = React.useMemo<TaskGroup[]>(() => {
    const titleById = new Map<string, string>(
      (projects ?? []).map((p) => [p.id, p.title]),
    );
    const byKey = new Map<string, TaskGroup>();
    for (const task of tasks) {
      const title = titleById.get(task.projectId);
      const isInbox = title === INBOX_PROJECT_NAME;
      const key = isInbox ? "__inbox__" : task.projectId;
      let group = byKey.get(key);
      if (!group) {
        group = {
          key,
          name: isInbox ? INBOX_GROUP_LABEL : (title ?? "Dự án khác"),
          isInbox,
          tasks: [],
        };
        byKey.set(key, group);
      }
      group.tasks.push(task);
    }
    // Nhóm project thật xếp trước (theo tên), nhóm "Việc lẻ" (Inbox) luôn cuối.
    return Array.from(byKey.values()).sort((a, b) => {
      if (a.isInbox !== b.isInbox) return a.isInbox ? 1 : -1;
      return a.name.localeCompare(b.name, "vi");
    });
  }, [tasks, projects]);

  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        Chưa có task nào. Nhấn <span className="font-medium">Tạo Task</span> để bắt đầu.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionError && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {actionError}
        </p>
      )}
      {groups.map((group) => (
        <div key={group.key} className="space-y-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold">{group.name}</h3>
            <span className="font-mono text-[11px] text-muted-foreground">
              {group.tasks.length}
            </span>
          </div>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Task</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                  <th className="px-3 py-2 font-medium">Ưu tiên</th>
                  <th className="px-3 py-2 font-medium">Deadline</th>
                  <th className="px-3 py-2 text-right font-medium">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {group.tasks.map((task) => (
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
      ))}
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
        {(task.estimateMinute != null || task.spentMinute != null) && (
          <div className="mt-0.5 text-xs text-muted-foreground">
            {task.estimateMinute != null && <span>Ước lượng: {task.estimateMinute} phút</span>}
            {task.estimateMinute != null && task.spentMinute != null && <span> · </span>}
            {task.spentMinute != null && (
              <span>
                Đã làm: <span className="font-medium text-foreground">{task.spentMinute} phút</span>
              </span>
            )}
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
        <PriorityStars impact={task.impact} urgency={task.urgency} score={task.priorityScore} />
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
