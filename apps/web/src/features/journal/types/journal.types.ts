/**
 * Journal types — copy CHÍNH XÁC từ _workspace/16_backend_journal.md.
 *
 * Ranh giới:
 * - 1 entry / user / ngày (@@unique userId+date). POST trùng ngày active → 409; POST ngày đã xoá mềm → revive (giữ id).
 * - `date` = "YYYY-MM-DD" (date-only). createdAt/updatedAt = ISO datetime.
 * - `date` KHÔNG đổi qua PATCH. mood free-text (không enum), optional.
 * - List trả MẢNG trong `data` + phân trang `meta`; query page/pageSize/sortOrder + dateFrom/dateTo.
 */

export interface Journal {
  id: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  content: string;
  mood: string | null;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

/** POST /journals */
export interface CreateJournalPayload {
  date: string; // "YYYY-MM-DD" bắt buộc
  content: string; // không rỗng
  mood?: string; // <= 50, free-text
}

/** PATCH /journals/{id} — KHÔNG đổi date */
export interface UpdateJournalPayload {
  content?: string;
  mood?: string;
}

export interface JournalQuery {
  page?: number;
  pageSize?: number; // 1..100
  sortOrder?: "asc" | "desc";
  dateFrom?: string; // "YYYY-MM-DD"
  dateTo?: string;
}
