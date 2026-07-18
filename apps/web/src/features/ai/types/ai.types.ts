/**
 * AI types — copy CHÍNH XÁC từ _workspace/17_ai_features.md + DTO/mapper thật trong apps/api/src/ai.
 *
 * Nguyên tắc UI (doc 07 §12): AI chỉ GỢI Ý, KHÔNG tự hành động/áp dụng thay đổi vào dữ liệu thật.
 * Response JSON thường (stream:false) — không SSE.
 */

// ---------- CHAT ----------
export type AiMessageRole = "USER" | "ASSISTANT" | "SYSTEM";

export interface AiConversation {
  id: string;
  userId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AiMessage {
  id: string;
  conversationId: string;
  role: AiMessageRole;
  content: string;
  metadata: unknown | null; // { model, tokens, latency } cho ASSISTANT
  createdAt: string;
}

/** GET /ai/conversations/{id} */
export interface AiConversationDetail extends AiConversation {
  messages: AiMessage[];
}

/** POST /ai/conversations/{id}/messages */
export interface SendMessageResult {
  userMessage: AiMessage;
  assistantMessage: AiMessage;
}

// ---------- SUMMARY ----------
export const SUMMARY_TYPES = ["DAILY", "WEEKLY", "MONTHLY"] as const;
export type SummaryType = (typeof SUMMARY_TYPES)[number];

export interface AiSummary {
  id: string;
  userId: string;
  type: SummaryType;
  periodStart: string; // "YYYY-MM-DD"
  periodEnd: string; // "YYYY-MM-DD"
  content: string; // markdown do LLM viết
  metadata: unknown | null; // metrics số nền auditable
  createdAt: string;
  updatedAt: string;
}

// ---------- CLASSIFY (Eisenhower) ----------
export type EisenhowerQuadrant = "DO_NOW" | "SCHEDULE" | "DELEGATE" | "ELIMINATE";

/** POST /ai/classify-task — runtime, không lưu. suggestion=true (chỉ gợi ý). */
export interface ClassifyResult {
  impact: number; // 1..5
  urgency: number; // 1..5
  priorityScore: number; // impact × urgency
  quadrant: EisenhowerQuadrant;
  reason: string | null;
  suggestion: true;
}

// ---------- PLAN SCHEDULE ----------
/** POST /ai/plan-schedule → { tasks, busy, freeSlots, plan (văn bản LLM), model? } */
export interface PlanResult {
  tasks: unknown[];
  busy: unknown[];
  freeSlots: unknown[];
  plan: string; // văn bản gợi ý (hoặc "chưa có task nào có deadline...")
  model?: string;
}

// ---------- FORECAST ----------
/** GET /ai/forecast → { ...data số nền, narrative (văn bản LLM), model? } */
export interface ForecastResult {
  narrative: string; // văn bản dự báo (hoặc "chưa có dữ liệu để dự báo")
  model?: string;
  [key: string]: unknown; // goals/kpis/finance số nền — hiển thị narrative là đủ cho Phase 4 UI
}
