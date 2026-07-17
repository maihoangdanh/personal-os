"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  LayoutGrid,
  List,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDateTime } from "@/lib/format";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useTaskList } from "@/features/tasks/hooks/useTasks";
import { TaskListView } from "@/features/tasks/components/TaskListView";
import { TaskFormDialog } from "@/features/tasks/components/TaskFormDialog";
import type { Task } from "@/features/tasks/types/task.types";
import {
  useDeleteMilestone,
  useMilestones,
  useProject,
} from "../hooks/useProjects";
import type { Milestone } from "../types/projects.types";
import { KanbanBoard } from "./KanbanBoard";
import { MilestoneFormDialog } from "./MilestoneFormDialog";

export function ProjectDetailView({ projectId }: { projectId: string }) {
  const { data: project, isLoading, isError, error } = useProject(projectId);
  const [view, setView] = React.useState<"kanban" | "list">("kanban");
  const [taskDialog, setTaskDialog] = React.useState(false);
  const [editingTask, setEditingTask] = React.useState<Task | null>(null);

  if (isLoading) return <div className="h-40 animate-pulse rounded-lg bg-muted" />;
  if (isError || !project)
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {extractApiErrorMessage(error, "Không tải được project")}
      </p>
    );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/projects"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Projects
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">{project.title}</h1>
          <Badge variant="outline">{project.status}</Badge>
        </div>
        <div className="mt-3 flex max-w-md items-center gap-3">
          <Progress value={project.progress} className="flex-1" />
          <span className="w-24 shrink-0 text-right text-sm text-muted-foreground">
            {project.progress}% hoàn thành
          </span>
        </div>
      </div>

      <MilestonesSection projectId={projectId} />

      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
            <Button
              variant={view === "kanban" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("kanban")}
            >
              <LayoutGrid className="h-4 w-4" /> Kanban
            </Button>
            <Button
              variant={view === "list" ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" /> Danh sách
            </Button>
          </div>
          <Button
            onClick={() => {
              setEditingTask(null);
              setTaskDialog(true);
            }}
          >
            <Plus className="h-4 w-4" /> Tạo Task
          </Button>
        </div>

        {view === "kanban" ? (
          <KanbanBoard projectId={projectId} />
        ) : (
          <ProjectTaskList
            projectId={projectId}
            onEdit={(t) => {
              setEditingTask(t);
              setTaskDialog(true);
            }}
          />
        )}
      </div>

      <TaskFormDialog
        open={taskDialog}
        onOpenChange={setTaskDialog}
        task={editingTask}
        defaultProjectId={projectId}
      />
    </div>
  );
}

function ProjectTaskList({
  projectId,
  onEdit,
}: {
  projectId: string;
  onEdit: (t: Task) => void;
}) {
  const { data, isLoading, isError, error } = useTaskList({
    projectId,
    pageSize: 100,
    sortBy: "priorityScore",
    sortOrder: "desc",
  });
  if (isLoading) return <div className="h-24 animate-pulse rounded-lg bg-muted" />;
  if (isError)
    return (
      <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
        {extractApiErrorMessage(error)}
      </p>
    );
  return <TaskListView tasks={data?.items ?? []} onEdit={onEdit} />;
}

function MilestonesSection({ projectId }: { projectId: string }) {
  const { data: milestones, isLoading } = useMilestones(projectId);
  const deleteMut = useDeleteMilestone();
  const [dialog, setDialog] = React.useState(false);
  const [editing, setEditing] = React.useState<Milestone | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  // Sắp xếp theo dueDate (null xuống cuối). Bản đơn giản thay Gantt (xem output).
  const sorted = React.useMemo(() => {
    const items = [...(milestones ?? [])];
    items.sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });
    return items;
  }, [milestones]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Milestones</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setEditing(null);
            setDialog(true);
          }}
        >
          <Plus className="h-4 w-4" /> Thêm
        </Button>
      </CardHeader>
      <CardContent className="space-y-2">
        {err && <p className="text-xs text-destructive">{err}</p>}
        {isLoading && <div className="h-10 animate-pulse rounded bg-muted" />}
        {!isLoading && sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">Chưa có milestone.</p>
        )}
        {sorted.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between gap-2 rounded-md border border-border p-2.5"
          >
            <div className="flex items-center gap-2">
              {m.isCompleted ? (
                <CheckCircle2 className="h-4 w-4 text-success" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="font-medium">{m.title}</span>
              {m.isCompleted && <Badge variant="success">Hoàn thành</Badge>}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {m.dueDate ? formatDateTime(m.dueDate) : "—"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                title="Sửa"
                onClick={() => {
                  setEditing(m);
                  setDialog(true);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Xoá (422 nếu còn task gán)"
                disabled={deleteMut.isPending}
                onClick={async () => {
                  setErr(null);
                  try {
                    await deleteMut.mutateAsync(m.id);
                  } catch (e) {
                    setErr(extractApiErrorMessage(e));
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
      <MilestoneFormDialog
        open={dialog}
        onOpenChange={setDialog}
        projectId={projectId}
        milestone={editing}
      />
    </Card>
  );
}
