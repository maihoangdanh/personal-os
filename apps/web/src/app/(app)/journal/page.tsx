import { JournalView } from "@/features/journal/components/JournalView";

export default function JournalPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Journal</h1>
        <p className="text-sm text-muted-foreground">
          Nhật ký hằng ngày — mỗi ngày một entry, ghi lại tâm trạng và suy nghĩ.
        </p>
      </div>
      <JournalView />
    </div>
  );
}
