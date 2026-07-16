import { Habit } from '@personal-os/database';

/** Exact shape returned for a Habit. Copy this when building the frontend type. */
export class HabitResponseDto {
  id!: string;
  userId!: string;
  name!: string;
  description!: string | null;
  frequency!: string; // free string, e.g. "DAILY" | "WEEKLY"
  targetPerPeriod!: number;
  createdAt!: string; // ISO-8601
  updatedAt!: string; // ISO-8601

  static from(habit: Habit): HabitResponseDto {
    return {
      id: habit.id,
      userId: habit.userId,
      name: habit.name,
      description: habit.description,
      frequency: habit.frequency,
      targetPerPeriod: habit.targetPerPeriod,
      createdAt: habit.createdAt.toISOString(),
      updatedAt: habit.updatedAt.toISOString(),
    };
  }
}
