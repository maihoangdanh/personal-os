"use client";

import * as React from "react";
import axios from "axios";
import { CheckCircle2, Flame, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCheckinHabit, useDeleteHabit, useHabitStreak } from "../hooks/useHabits";
import type { Habit } from "../types/habit.types";

interface HabitCardProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
}

export function HabitCard({ habit, onEdit }: HabitCardProps) {
  const streakQuery = useHabitStreak(habit.id);
  const checkinMut = useCheckinHabit();
  const deleteMut = useDeleteHabit();
  const [error, setError] = React.useState<string | null>(null);

  const streak = streakQuery.data;
  const checkedInToday = streak?.checkedInToday ?? false;
  const busy = checkinMut.isPending || deleteMut.isPending;

  async function handleCheckin() {
    setError(null);
    try {
      await checkinMut.mutateAsync({ id: habit.id });
    } catch (err) {
      // 409 = đã check-in hôm nay. Không hiện lỗi đỏ — chỉ đồng bộ lại trạng thái
      // (streak.checkedInToday sẽ thành true) và để UI hiển thị "Đã check-in".
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        streakQuery.refetch();
        return;
      }
      setError(extractApiErrorMessage(err));
    }
  }

  async function handleDelete() {
    setError(null);
    try {
      await deleteMut.mutateAsync(habit.id);
    } catch (err) {
      setError(extractApiErrorMessage(err));
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{habit.name}</span>
            <Badge variant="outline">
              {habit.frequency === "WEEKLY" ? "Hàng tuần" : "Hàng ngày"}
            </Badge>
          </div>
          {habit.description && (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {habit.description}
            </p>
          )}
          <div className="flex items-center gap-1.5 text-sm">
            <Flame
              className={
                streak && streak.currentStreak > 0
                  ? "h-4 w-4 text-warning-foreground"
                  : "h-4 w-4 text-muted-foreground"
              }
            />
            <span className="text-muted-foreground">
              Streak:{" "}
              <span className="font-semibold text-foreground">
                {streakQuery.isLoading ? "…" : (streak?.currentStreak ?? 0)}
              </span>{" "}
              ngày
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={checkedInToday ? "secondary" : "success"}
            size="sm"
            disabled={busy || checkedInToday || streakQuery.isLoading}
            onClick={handleCheckin}
            title={checkedInToday ? "Đã check-in hôm nay" : "Check-in hôm nay"}
          >
            <CheckCircle2 className="h-4 w-4" />
            {checkedInToday ? "Đã check-in" : "Check-in hôm nay"}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Sửa"
            disabled={busy}
            onClick={() => onEdit(habit)}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            title="Xoá (soft delete)"
            disabled={busy}
            onClick={handleDelete}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
      {error && (
        <p className="px-4 pb-3 text-sm text-destructive">{error}</p>
      )}
    </Card>
  );
}
