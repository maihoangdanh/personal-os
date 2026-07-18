import { AiView } from "@/features/ai/components/AiView";

export default function AiPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">AI Assistant</h1>
        <p className="text-sm text-muted-foreground">
          Chat trên dữ liệu cá nhân, tổng kết định kỳ, gợi ý lịch và dự báo — AI chỉ gợi ý, không tự
          thay đổi dữ liệu.
        </p>
      </div>
      <AiView />
    </div>
  );
}
