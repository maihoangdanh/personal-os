import { TasksView } from "@/features/tasks/components/TasksView";

export default function TasksPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Tasks</h1>
        <p className="text-sm text-muted-foreground">
          Quản lý công việc — danh sách, ma trận Eisenhower, timer.
        </p>
      </div>
      <TasksView />
    </div>
  );
}
