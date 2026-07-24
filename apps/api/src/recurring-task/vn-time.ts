/**
 * Toàn bộ tính toán "ngày hôm nay"/"giờ hiện tại" cho task lặp lại phải theo giờ
 * Việt Nam (UTC+7, cố định — hệ thống hiện chỉ 1 user thật, không cần timezone
 * theo từng user), KHÔNG theo giờ hệ điều hành của server. Server production chạy
 * container UTC (xác nhận 2026-07-24) — nếu dùng `new Date().getHours()` v.v. (local
 * getters) sẽ tính "hôm nay"/"deadline" lệch múi giờ thật của người dùng, gây sinh
 * task sai ngày/sai giờ hiển thị (bug thật đã gặp: mặc định 23:59 "server-local" bị
 * hiển thị thành 06:59 NGÀY HÔM SAU trên trình duyệt VN).
 *
 * Cách làm: luôn thao tác qua các hàm dưới đây (dùng getUTC-getters và Date.UTC nội bộ), không
 * bao giờ gọi `new Date().getHours()`/`new Date(y,m,d,h,m)` trực tiếp ở nơi khác
 * trong module recurring-task.
 */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface VnDate {
  year: number;
  month: number; // 0-based, khớp Date.UTC
  day: number;
}

/** Ngày/tháng/năm hiện tại theo giờ VN, đúng bất kể server chạy múi giờ nào. */
export function vnTodayYMD(): VnDate {
  const shifted = new Date(Date.now() + VN_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth(),
    day: shifted.getUTCDate(),
  };
}

/** ISO weekday (1=T2..7=CN) của ngày hôm nay theo giờ VN. */
export function vnTodayIsoWeekday(): number {
  const { year, month, day } = vnTodayYMD();
  const jsDay = new Date(Date.UTC(year, month, day)).getUTCDay(); // 0=CN..6=T7
  return ((jsDay + 6) % 7) + 1;
}

/**
 * UTC-midnight của ngày VN hiện tại — dùng để lưu/so sánh `lastGeneratedDate`
 * (Postgres `@db.Date` truncate theo UTC nên value ở đây đọc lại byte-identical).
 */
export function vnTodayAsUtcDateOnly(): Date {
  const { year, month, day } = vnTodayYMD();
  return new Date(Date.UTC(year, month, day));
}

/** Thời điểm UTC thật ứng với "hôm nay theo giờ VN, lúc {hour}:{minute} giờ VN}". */
export function vnTodayAt(hour: number, minute: number): Date {
  const { year, month, day } = vnTodayYMD();
  return new Date(Date.UTC(year, month, day, hour, minute, 0, 0) - VN_OFFSET_MS);
}

/** Thời điểm UTC thật ứng với 00:00 giờ VN hôm nay (mốc "đầu ngày" để so sánh quá hạn). */
export function vnTodayStart(): Date {
  return vnTodayAt(0, 0);
}
