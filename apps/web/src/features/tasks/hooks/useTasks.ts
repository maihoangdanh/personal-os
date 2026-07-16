"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { taskService } from "../services/task.service";
import type {
  CreateTaskPayload,
  TaskQuery,
  UpdateTaskPayload,
} from "../types/task.types";

export const taskKeys = {
  all: ["tasks"] as const,
  list: (query: TaskQuery) => ["tasks", "list", query] as const,
  detail: (id: string) => ["tasks", "detail", id] as const,
};

export function useTaskList(query: TaskQuery) {
  return useQuery({
    queryKey: taskKeys.list(query),
    queryFn: () => taskService.list(query),
    staleTime: 30_000,
  });
}

function useInvalidateTasks() {
  const qc = useQueryClient();
  return () => qc.invalidateQueries({ queryKey: taskKeys.all });
}

export function useCreateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (payload: CreateTaskPayload) => taskService.create(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateTaskPayload }) =>
      taskService.update(id, payload),
    onSuccess: invalidate,
  });
}

export function useDeleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => taskService.remove(id),
    onSuccess: invalidate,
  });
}

export function useCompleteTask() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => taskService.complete(id),
    onSuccess: invalidate,
  });
}

export function useStartTimer() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => taskService.startTimer(id),
    onSuccess: invalidate,
  });
}

export function useStopTimer() {
  const invalidate = useInvalidateTasks();
  return useMutation({
    mutationFn: (id: string) => taskService.stopTimer(id),
    onSuccess: invalidate,
  });
}
