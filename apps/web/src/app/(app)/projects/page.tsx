import { ProjectListView } from "@/features/projects/components/ProjectListView";

export default function ProjectsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Projects</h1>
        <p className="text-sm text-muted-foreground">
          Project thuộc một Goal. Progress do backend tự tính từ task.
        </p>
      </div>
      <ProjectListView />
    </div>
  );
}
