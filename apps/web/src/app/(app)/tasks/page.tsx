import { PageHeader } from "@/components/layout/PageHeader";
import { TasksView } from "@/features/tasks/components/TasksView";

export default function TasksPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Công việc"
        title="Tasks"
        description="Quản lý công việc — danh sách, ma trận Eisenhower, timer."
      />
      <TasksView />
    </div>
  );
}
