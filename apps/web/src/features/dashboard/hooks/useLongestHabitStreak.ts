"use client";

import { useQueries } from "@tanstack/react-query";
import { habitKeys } from "@/features/habit/hooks/useHabits";
import { habitService } from "@/features/habit/services/habit.service";
import { useHabitList } from "@/features/habit/hooks/useHabits";

/**
 * Dashboard StatStrip "Streak dài nhất". Gọi GET /habits/:id/streak cho từng habit (N+1 —
 * chấp nhận được vì số habit nhỏ) bằng đúng queryKey của useHabitStreak nên chia sẻ cache với
 * HabitStreakWidget — 2 widget cùng mount trên Dashboard KHÔNG gây gọi API trùng lặp.
 */
interface LongestStreak {
  habitName: string;
  currentStreak: number;
}

export function useLongestHabitStreak(): {
  data: LongestStreak | null;
  isLoading: boolean;
} {
  const { data: habits, isLoading: habitsLoading } = useHabitList();

  const streakQueries = useQueries({
    queries: (habits ?? []).map((habit) => ({
      queryKey: habitKeys.streak(habit.id),
      queryFn: () => habitService.streak(habit.id),
      staleTime: 30_000,
      enabled: !!habits,
    })),
  });

  const isLoading = habitsLoading || streakQueries.some((q) => q.isLoading);

  let longest: LongestStreak | null = null;
  (habits ?? []).forEach((habit, i) => {
    const streak = streakQueries[i]?.data;
    if (!streak) return;
    if (!longest || streak.currentStreak > longest.currentStreak) {
      longest = { habitName: habit.name, currentStreak: streak.currentStreak };
    }
  });

  return { data: longest, isLoading };
}
