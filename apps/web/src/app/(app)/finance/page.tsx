import { FinanceView } from "@/features/finance/components/FinanceView";

export default function FinancePage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Finance</h1>
        <p className="text-sm text-muted-foreground">
          Ví, giao dịch, ngân sách, đầu tư, tài sản và báo cáo tài chính.
        </p>
      </div>
      <FinanceView />
    </div>
  );
}
