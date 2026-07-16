import { CalendarView } from "@/features/calendar/components/CalendarView";

export default function CalendarPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Lịch sự kiện — xem theo ngày/tuần và quản lý sự kiện.
        </p>
      </div>
      <CalendarView />
    </div>
  );
}
