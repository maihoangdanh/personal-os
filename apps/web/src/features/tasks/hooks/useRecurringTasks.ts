"use client";

import { useMutation } from "@tanstack/react-query";
import { recurringTaskService } from "../services/recurring-task.service";
import type { CreateRecurringTaskPayload } from "../types/task.types";
import { useInvalidateTasks } from "./useTasks";

export function useCreateRecurringTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (payload: CreateRecurringTaskPayload) => recurringTaskService.create(payload),
    onSuccess: invalidate,
  });
}

export function useStopRecurringTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => recurringTaskService.stop(id),
    onSuccess: invalidate,
  });
}
