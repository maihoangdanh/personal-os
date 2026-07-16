import { HabitsView } from "@/features/habit/components/HabitsView";

export default function HabitsPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Habits</h1>
        <p className="text-sm text-muted-foreground">
          Theo dõi thói quen — check-in hàng ngày và giữ streak.
        </p>
      </div>
      <HabitsView />
    </div>
  );
}
