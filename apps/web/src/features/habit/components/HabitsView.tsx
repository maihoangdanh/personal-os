"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useHabitList } from "../hooks/useHabits";
import type { Habit } from "../types/habit.types";
import { HabitCard } from "./HabitCard";
import { HabitFormDialog } from "./HabitFormDialog";

export function HabitsView() {
  const { data, isLoading, isError, error } = useHabitList();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Habit | null>(null);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(habit: Habit) {
    setEditing(habit);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Tạo Habit
        </Button>
      </div>

      {isLoading && <HabitsSkeleton />}

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive">
          Không tải được danh sách habit: {extractApiErrorMessage(error)}
        </div>
      )}

      {!isLoading && !isError && data && (
        <>
          {data.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
              Chưa có thói quen nào. Nhấn{" "}
              <span className="font-medium">Tạo Habit</span> để bắt đầu.
            </div>
          ) : (
            <div className="space-y-3">
              {data.map((habit) => (
                <HabitCard key={habit.id} habit={habit} onEdit={openEdit} />
              ))}
            </div>
          )}
        </>
      )}

      <HabitFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        habit={editing}
      />
    </div>
  );
}

function HabitsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="h-20 animate-pulse rounded-lg bg-muted"
          aria-hidden
        />
      ))}
    </div>
  );
}
