"use client";

import * as React from "react";
import { useQueries } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/PageHeader";
import { extractApiErrorMessage } from "@/lib/api-client";
import { habitKeys, useHabitList } from "../hooks/useHabits";
import { habitService } from "../services/habit.service";
import type { Habit } from "../types/habit.types";
import { HabitCard } from "./HabitCard";
import { HabitFormDialog } from "./HabitFormDialog";

export function HabitsView() {
  const { data, isLoading, isError, error } = useHabitList();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Habit | null>(null);

  // Aggregate check-in hôm nay cho summary — useQueries CÙNG queryKey với per-card
  // (React Query chia sẻ cache → KHÔNG thêm API call).
  const streakQueries = useQueries({
    queries: (data ?? []).map((h) => ({
      queryKey: habitKeys.streak(h.id),
      queryFn: () => habitService.streak(h.id),
      staleTime: 30_000,
    })),
  });
  const total = data?.length ?? 0;
  const doneToday = streakQueries.filter((q) => q.data?.checkedInToday).length;
  const donePct = total > 0 ? (doneToday / total) * 100 : 0;

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(habit: Habit) {
    setEditing(habit);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Thói quen"
        title="Habits"
        description="Check-in mỗi ngày để giữ chuỗi."
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" /> Tạo Habit
          </Button>
        }
      />

      {isLoading && <HabitsSkeleton />}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Không tải được danh sách habit: {extractApiErrorMessage(error)}
        </div>
      )}

      {!isLoading && !isError && data && data.length === 0 && (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Chưa có thói quen nào. Nhấn <span className="font-medium">Tạo Habit</span> để bắt đầu.
        </div>
      )}

      {!isLoading && !isError && data && data.length > 0 && (
        <>
          {/* Summary check-in hôm nay */}
          <div className="flex items-center gap-4 rounded-[14px] border border-border bg-card px-5 py-4 shadow-sm">
            <div className="flex-none font-serif text-[24px] font-bold">
              {doneToday}/{total}
            </div>
            <div className="flex-1">
              <div className="mb-1.5 text-[12px] text-muted-foreground">đã check-in hôm nay</div>
              <div className="h-[7px] overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-warning transition-all"
                  style={{ width: `${donePct}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {data.map((habit) => (
              <HabitCard key={habit.id} habit={habit} onEdit={openEdit} />
            ))}
          </div>
        </>
      )}

      <HabitFormDialog open={dialogOpen} onOpenChange={setDialogOpen} habit={editing} />
    </div>
  );
}

function HabitsSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-[16px] bg-muted" aria-hidden />
      ))}
    </div>
  );
}
