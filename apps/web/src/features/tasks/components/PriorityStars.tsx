import { Star } from "lucide-react";
import { priorityToStars } from "../lib/priority";

/**
 * Hiển thị ưu tiên task dạng 5 sao (sao đầy = gold/warning, sao rỗng = muted).
 * Dùng chung ở bảng Tasks (TaskListView) và widget Dashboard (UrgentImportantWidget).
 */
export function PriorityStars({
  impact,
  urgency,
  score,
}: {
  impact: number;
  urgency: number;
  score: number | null;
}) {
  const stars = priorityToStars(impact, urgency, score);
  const raw = score ?? impact * urgency;
  return (
    <div
      className="flex items-center gap-0.5"
      title={`Impact ${impact} × Urgency ${urgency} = ${raw}`}
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={
            i <= stars
              ? "h-3.5 w-3.5 fill-warning text-warning"
              : "h-3.5 w-3.5 text-muted-foreground/40"
          }
        />
      ))}
    </div>
  );
}
