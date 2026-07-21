"use client";

import * as React from "react";
import axios from "axios";
import { Flame, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { extractApiErrorMessage } from "@/lib/api-client";
import { useCheckinHabit, useDeleteHabit, useHabitStreak } from "../hooks/useHabits";
import type { Habit } from "../types/habit.types";

interface HabitCardProps {
  habit: Habit;
  onEdit: (habit: Habit) => void;
}

const DOTS = 14;

/**
 * Suy 14 ô lịch sử (14 ngày gần nhất) từ dữ liệu streak có sẵn (currentStreak + checkedInToday +
 * lastLogDate). LƯU Ý: đây là XẤP XỈ — backend chưa có endpoint log theo ngày, nên chỉ tô `streak`
 * ô liên tiếp kết thúc ở ngày log gần nhất. Không thêm API call. (Cần endpoint habit logs để chính xác.)
 */
function buildDots(
  currentStreak: number,
  checkedInToday: boolean,
  lastLogDate: string | null,
): boolean[] {
  const dots = new Array<boolean>(DOTS).fill(false);
  if (currentStreak <= 0) return dots;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let anchorOffset = 0; // số ngày kể từ hôm nay tới ngày log gần nhất
  if (checkedInToday) {
    anchorOffset = 0;
  } else if (lastLogDate) {
    const last = new Date(lastLogDate + "T00:00:00");
    anchorOffset = Math.round((today.getTime() - last.getTime()) / 86400000);
  }
  const anchorIdx = DOTS - 1 - anchorOffset; // index của ngày log gần nhất
  for (let i = 0; i < currentStreak; i++) {
    const idx = anchorIdx - i;
    if (idx >= 0 && idx < DOTS) dots[idx] = true;
  }
  return dots;
}

export function HabitCard({ habit, onEdit }: HabitCardProps) {
  const streakQuery = useHabitStreak(habit.id);
  const checkinMut = useCheckinHabit();
  const deleteMut = useDeleteHabit();
  const [error, setError] = React.useState<string | null>(null);

  const streak = streakQuery.data;
  const checkedInToday = streak?.checkedInToday ?? false;
  const currentStreak = streak?.currentStreak ?? 0;
  const busy = checkinMut.isPending || deleteMut.isPending;
  const dots = buildDots(currentStreak, checkedInToday, streak?.lastLogDate ?? null);

  async function handleCheckin() {
    setError(null);
    try {
      await checkinMut.mutateAsync({ id: habit.id });
    } catch (err) {
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
      <CardContent className="p-[22px]">
        {/* header: name + freq / check-in pill */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-[14.5px] font-semibold">{habit.name}</div>
            <div className="mt-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
              {habit.frequency === "WEEKLY" ? "Hàng tuần" : "Hàng ngày"}
            </div>
          </div>
          <div className="flex flex-none items-center gap-1">
            <button
              type="button"
              disabled={busy || checkedInToday || streakQuery.isLoading}
              onClick={handleCheckin}
              className={cn(
                "whitespace-nowrap rounded-full border px-[13px] py-[7px] text-[12px] font-semibold transition-colors disabled:cursor-default",
                checkedInToday
                  ? "border-success/30 bg-success/10 text-success"
                  : "border-border bg-primary text-primary-foreground hover:bg-primary/90",
              )}
            >
              {checkedInToday ? "Đã check-in" : "Check-in"}
            </button>
            <Button variant="ghost" size="icon" title="Sửa" disabled={busy} onClick={() => onEdit(habit)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              title="Xoá"
              disabled={busy}
              onClick={handleDelete}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>

        {/* streak */}
        <div className="my-[14px] flex items-baseline gap-2">
          <Flame
            className={cn(
              "h-[18px] w-[18px] self-center",
              currentStreak > 0 ? "text-warning" : "text-muted-foreground",
            )}
            strokeWidth={1.8}
          />
          <span className="font-serif text-[26px] font-bold">
            {streakQuery.isLoading ? "…" : currentStreak}
          </span>
          <span className="text-[12px] text-muted-foreground">ngày liên tiếp</span>
        </div>

        {/* 14-day dots */}
        <div className="flex gap-[5px]">
          {dots.map((filled, i) => (
            <div
              key={i}
              className={cn(
                "h-5 flex-1 rounded-[5px]",
                filled ? "bg-warning" : "bg-secondary",
              )}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between font-mono text-[9.5px] text-muted-foreground">
          <span>14 NGÀY TRƯỚC</span>
          <span>HÔM NAY</span>
        </div>

        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </CardContent>
    </Card>
  );
}
