"use client";

import Link from "next/link";
import { ArrowRight, Check, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractApiErrorMessage } from "@/lib/api-client";
import {
  useCheckinHabit,
  useHabitList,
  useHabitStreak,
} from "@/features/habit/hooks/useHabits";
import type { Habit } from "@/features/habit/types/habit.types";

/**
 * Habit Streak widget.
 * `GET /habits` trả mảng habit KHÔNG kèm streak → mỗi habit tự gọi `GET /habits/{id}/streak`
 * (dùng hook useHabitStreak đã có) để lấy currentStreak + checkedInToday.
 * Nút check-in nhanh gọi `POST /habits/{id}/checkin`; disable khi đã check-in hôm nay.
 */
export function HabitStreakWidget() {
  const { data: habits, isLoading, isError, error } = useHabitList();

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-warning" /> Habit Streak
        </CardTitle>
        <Link
          href="/habits"
          className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          Xem tất cả <ArrowRight className="h-4 w-4" />
        </Link>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-md bg-muted" />
            ))}
          </div>
        )}

        {isError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Không tải được habit: {extractApiErrorMessage(error)}
          </p>
        )}

        {!isLoading && !isError && habits && habits.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Chưa có habit nào. Tạo habit để bắt đầu chuỗi ngày! 🔥
          </p>
        )}

        {!isLoading && !isError && habits && habits.length > 0 && (
          <ul className="divide-y divide-border">
            {habits.map((habit) => (
              <HabitStreakRow key={habit.id} habit={habit} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function HabitStreakRow({ habit }: { habit: Habit }) {
  const { data: streak, isLoading } = useHabitStreak(habit.id);
  const checkinMut = useCheckinHabit();

  const checkedInToday = streak?.checkedInToday ?? false;
  const currentStreak = streak?.currentStreak ?? 0;

  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="truncate font-medium">{habit.name}</div>
        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          {isLoading ? (
            <span>Đang tải streak...</span>
          ) : (
            <>
              <Flame className="h-3.5 w-3.5 text-warning" />
              <span>
                {currentStreak} ngày liên tiếp
                {checkedInToday && " · đã check-in hôm nay"}
              </span>
            </>
          )}
        </div>
      </div>
      <Button
        variant={checkedInToday ? "ghost" : "success"}
        size="sm"
        disabled={isLoading || checkedInToday || checkinMut.isPending}
        title={checkedInToday ? "Đã check-in hôm nay" : "Check-in hôm nay"}
        onClick={() => checkinMut.mutate({ id: habit.id })}
      >
        <Check className="h-4 w-4" />
        {checkedInToday ? "Đã xong" : "Check-in"}
      </Button>
    </li>
  );
}
