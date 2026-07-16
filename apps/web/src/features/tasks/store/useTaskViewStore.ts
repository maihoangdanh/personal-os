import { create } from "zustand";
import type { TaskStatus } from "../types/task.types";

/** Client state cục bộ cho màn Task: chế độ xem + bộ lọc. Server state đi qua React Query. */
export type TaskViewMode = "list" | "matrix";

interface TaskViewState {
  view: TaskViewMode;
  statusFilter: TaskStatus | "ALL";
  keyword: string;
  page: number;
  setView: (view: TaskViewMode) => void;
  setStatusFilter: (status: TaskStatus | "ALL") => void;
  setKeyword: (keyword: string) => void;
  setPage: (page: number) => void;
}

export const useTaskViewStore = create<TaskViewState>((set) => ({
  view: "list",
  statusFilter: "ALL",
  keyword: "",
  page: 1,
  setView: (view) => set({ view }),
  setStatusFilter: (statusFilter) => set({ statusFilter, page: 1 }),
  setKeyword: (keyword) => set({ keyword, page: 1 }),
  setPage: (page) => set({ page }),
}));
