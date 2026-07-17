/** Format ISO string sang hiển thị local ngắn gọn. Trả "—" khi null. */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Format tiền VNĐ. Hiển thị đúng số API trả (number đã có 2 chữ số thập phân) — KHÔNG làm tròn
 * sai lệch, chỉ định dạng phân tách nghìn. Không dùng ký hiệu ₫ ngầm làm tròn — dùng
 * Intl vi-VN currency VND (VND vốn không phần lẻ nhưng ta cho phép tối đa 2 chữ số để không mất số).
 */
export function formatCurrency(amount: number): string {
  if (typeof amount !== "number" || Number.isNaN(amount)) return "—";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** true nếu ISO nằm trong ngày hôm nay (local). */
export function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
