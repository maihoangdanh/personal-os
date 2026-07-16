import { NotificationsView } from "@/features/notification/components/NotificationsView";

export default function RemindersPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Reminders</h1>
        <p className="text-sm text-muted-foreground">
          Lời nhắc — theo dõi, đánh dấu đã đọc và snooze.
        </p>
      </div>
      <NotificationsView />
    </div>
  );
}
