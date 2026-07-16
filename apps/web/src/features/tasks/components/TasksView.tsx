"use client";

import * as React from "react";
import { LayoutGrid, List, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useTaskList } from "../hooks/useTasks";
import { useTaskViewStore } from "../store/useTaskViewStore";
import { STATUS_LABELS } from "../lib/status";
import { TASK_STATUSES, type Task, type TaskQuery } from "../types/task.types";
import { TaskFormDialog } from "./TaskFormDialog";
import { TaskListView } from "./TaskListView";
import { EisenhowerMatrix } from "./EisenhowerMatrix";

const PAGE_SIZE = 20;
const MATRIX_PAGE_SIZE = 100;

export function TasksView() {
  const {
    view,
    statusFilter,
    keyword,
    page,
    setView,
    setStatusFilter,
    setKeyword,
    setPage,
  } = useTaskViewStore();

  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Task | null>(null);

  // Debounce keyword để không gọi API mỗi ký tự.
  const [searchInput, setSearchInput] = React.useState(keyword);
  React.useEffect(() => {
    const t = setTimeout(() => setKeyword(searchInput), 350);
    return () => clearTimeout(t);
  }, [searchInput, setKeyword]);

  const query: TaskQuery =
    view === "matrix"
      ? { page: 1, pageSize: MATRIX_PAGE_SIZE, sortBy: "priorityScore", sortOrder: "desc" }
      : {
          page,
          pageSize: PAGE_SIZE,
          sortBy: "createdAt",
          sortOrder: "desc",
          ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
          ...(keyword ? { keyword } : {}),
        };

  const { data, isLoading, isError, error } = useTaskList(query);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(task: Task) {
    setEditing(task);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" /> Danh sách
          </Button>
          <Button
            variant={view === "matrix" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setView("matrix")}
          >
            <LayoutGrid className="h-4 w-4" /> Eisenhower
          </Button>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tạo Task
        </Button>
      </div>

      {view === "list" && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Tìm theo tiêu đề / mô tả..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          <Select
            className="w-44"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as typeof statusFilter)
            }
          >
            <option value="ALL">Tất cả status</option>
            {TASK_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </div>
      )}

      {isLoading && <TasksSkeleton />}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Không tải được danh sách task: {extractApiErrorMessage(error)}
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          {view === "list" ? (
            <>
              <TaskListView tasks={data.items} onEdit={openEdit} />
              {data.meta.totalPages > 1 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    Trang {data.meta.page}/{data.meta.totalPages} · Tổng{" "}
                    {data.meta.total}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.meta.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      Sau
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EisenhowerMatrix tasks={data.items} onSelect={openEdit} />
          )}
        </>
      )}

      <TaskFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={editing}
      />
    </div>
  );
}

function TasksSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="h-12 animate-pulse rounded-md bg-muted"
          aria-hidden
        />
      ))}
    </div>
  );
}
