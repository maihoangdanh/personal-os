"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recurringTaskService } from "../services/recurring-task.service";
import type { CreateRecurringTaskPayload } from "../types/task.types";
import { taskKeys } from "./useTasks";

export function useCreateRecurringTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRecurringTaskPayload) => recurringTaskService.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useStopRecurringTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => recurringTaskService.stop(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
