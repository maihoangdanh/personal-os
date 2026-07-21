/**
 * Map priorityScore (impact × urgency, 1..25) → số sao 1..5, chia đều 5 khoảng:
 * 1-5→1★, 6-10→2★, 11-15→3★, 16-20→4★, 21-25→5★.
 * Fallback impact × urgency khi priorityScore null.
 */
export function priorityToStars(
  impact: number,
  urgency: number,
  score: number | null,
): number {
  const raw = score ?? impact * urgency;
  return Math.min(5, Math.max(1, Math.ceil(raw / 5)));
}
