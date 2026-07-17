import { GoalTreeView } from "@/features/goals/components/GoalTreeView";

export default function GoalsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Goals</h1>
        <p className="text-sm text-muted-foreground">
          Cây phân cấp Vision → Goal → KPI. Progress do backend tự tính.
        </p>
      </div>
      <GoalTreeView />
    </div>
  );
}
