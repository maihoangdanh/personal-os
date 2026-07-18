/**
 * Pure, DB-free computation helpers for the AI module.
 *
 * Kept separate from services so the DETERMINISTIC part of every AI feature
 * (period ranges, priority math, free-slot subtraction, goal projection, JSON
 * extraction) is unit-testable without a database or an LLM. Per the
 * ai-feature-design skill: code computes the numbers, the model only writes prose.
 */

/** String-literal mirror of AiSummaryType — kept local so this file stays DB-free
 *  (unit-testable without loading the Prisma client). Assignable from the enum. */
export type SummaryPeriodType = 'DAILY' | 'WEEKLY' | 'MONTHLY';

const MS_PER_MINUTE = 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Priority / Eisenhower (feature 3)
// ---------------------------------------------------------------------------

/** Business Rule (doc 02): priorityScore = impact × urgency. */
export function priorityScore(impact: number, urgency: number): number {
  return impact * urgency;
}

export type EisenhowerQuadrant =
  | 'DO_NOW' // important + urgent
  | 'SCHEDULE' // important, not urgent
  | 'DELEGATE' // urgent, not important
  | 'ELIMINATE'; // neither

/** Map a 1-5 impact/urgency pair onto the Eisenhower matrix (threshold >= 3). */
export function eisenhowerQuadrant(
  impact: number,
  urgency: number,
): EisenhowerQuadrant {
  const important = impact >= 3;
  const urgent = urgency >= 3;
  if (important && urgent) return 'DO_NOW';
  if (important && !urgent) return 'SCHEDULE';
  if (!important && urgent) return 'DELEGATE';
  return 'ELIMINATE';
}

// ---------------------------------------------------------------------------
// Period ranges (feature 2 — summaries)
// ---------------------------------------------------------------------------

/** UTC midnight for the given instant. */
export function toUtcDateOnly(instant: Date): Date {
  return new Date(
    Date.UTC(instant.getUTCFullYear(), instant.getUTCMonth(), instant.getUTCDate()),
  );
}

/** "YYYY-MM-DD" (UTC) for a Date. */
export function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** UTC Monday of the ISO week containing `d`. */
export function weekStart(d: Date): Date {
  const date = toUtcDateOnly(d);
  const day = date.getUTCDay(); // 0=Sun..6=Sat
  const backToMonday = (day + 6) % 7;
  return new Date(date.getTime() - backToMonday * MS_PER_DAY);
}

export interface PeriodRange {
  /** Inclusive instant window used to filter timestamped rows. */
  from: Date;
  to: Date;
  /** Date-only bounds stored on AiSummary (@db.Date). */
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Resolve the [from,to] instant window and the date-only [periodStart,periodEnd]
 * for a DAILY/WEEKLY/MONTHLY summary covering the day `anchor` (all UTC).
 */
export function periodRange(type: SummaryPeriodType, anchor: Date): PeriodRange {
  const endOfDay = (d: Date): Date =>
    new Date(d.getTime() + MS_PER_DAY - 1); // 23:59:59.999 of that UTC day

  if (type === 'DAILY') {
    const start = toUtcDateOnly(anchor);
    return { from: start, to: endOfDay(start), periodStart: start, periodEnd: start };
  }
  if (type === 'WEEKLY') {
    const start = weekStart(anchor);
    const end = new Date(start.getTime() + 6 * MS_PER_DAY);
    return { from: start, to: endOfDay(end), periodStart: start, periodEnd: end };
  }
  // MONTHLY
  const y = anchor.getUTCFullYear();
  const m = anchor.getUTCMonth();
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 0)); // day 0 of next month = last day
  return { from: start, to: endOfDay(end), periodStart: start, periodEnd: end };
}

// ---------------------------------------------------------------------------
// Free-slot computation (feature 4 — smart planning)
// ---------------------------------------------------------------------------

export interface Interval {
  start: Date;
  end: Date;
}

export interface FreeSlot {
  start: string; // ISO
  end: string; // ISO
  minutes: number;
}

/**
 * Subtract `busy` intervals from each working `window` and return the remaining
 * free segments. Deterministic: this is the ground truth the LLM must arrange
 * tasks into — the model never invents availability.
 */
export function computeFreeSlots(
  windows: Interval[],
  busy: Interval[],
  minMinutes = 15,
): FreeSlot[] {
  const slots: FreeSlot[] = [];
  const sortedBusy = [...busy].sort((a, b) => a.start.getTime() - b.start.getTime());

  for (const window of windows) {
    let cursor = window.start.getTime();
    const windowEnd = window.end.getTime();

    for (const b of sortedBusy) {
      const bStart = b.start.getTime();
      const bEnd = b.end.getTime();
      if (bEnd <= cursor || bStart >= windowEnd) continue; // no overlap with remaining window
      if (bStart > cursor) {
        pushSlot(slots, cursor, Math.min(bStart, windowEnd), minMinutes);
      }
      cursor = Math.max(cursor, bEnd);
      if (cursor >= windowEnd) break;
    }
    if (cursor < windowEnd) {
      pushSlot(slots, cursor, windowEnd, minMinutes);
    }
  }
  return slots;
}

function pushSlot(slots: FreeSlot[], startMs: number, endMs: number, minMinutes: number): void {
  const minutes = Math.round((endMs - startMs) / MS_PER_MINUTE);
  if (minutes >= minMinutes) {
    slots.push({
      start: new Date(startMs).toISOString(),
      end: new Date(endMs).toISOString(),
      minutes,
    });
  }
}

/**
 * Build working windows (default 08:00–18:00 UTC) for `days` consecutive days
 * starting at `fromDay`. Note: UTC — documented; user timezone not carried on
 * the auth token today.
 */
export function workingWindows(
  fromDay: Date,
  days: number,
  startHour = 8,
  endHour = 18,
): Interval[] {
  const windows: Interval[] = [];
  const base = toUtcDateOnly(fromDay);
  for (let i = 0; i < days; i++) {
    const dayStart = new Date(base.getTime() + i * MS_PER_DAY);
    windows.push({
      start: new Date(dayStart.getTime() + startHour * 60 * MS_PER_MINUTE),
      end: new Date(dayStart.getTime() + endHour * 60 * MS_PER_MINUTE),
    });
  }
  return windows;
}

// ---------------------------------------------------------------------------
// Goal / KPI projection (feature 5 — forecast)
// ---------------------------------------------------------------------------

export interface Projection {
  progressPercent: number; // min(100, current/target*100); 0 if target missing/<=0
  daysElapsed: number | null; // since createdAt
  daysToDeadline: number | null; // now -> deadline
  impliedDailyRate: number | null; // currentValue / daysElapsed
  projectedValue: number | null; // current + rate * daysToDeadline
  onTrack: boolean | null; // projectedValue >= target
}

/**
 * Project whether a Goal/KPI reaches its target by its deadline, from the
 * average rate implied since it was created. All numbers computed here — the
 * model only narrates the result (never re-derives the forecast).
 */
export function projectTarget(
  currentValue: number,
  targetValue: number | null,
  createdAt: Date,
  deadline: Date | null,
  now: Date,
): Projection {
  const progressPercent =
    targetValue && targetValue > 0
      ? Math.min(100, round2((currentValue / targetValue) * 100))
      : 0;

  const daysElapsed = daysBetween(createdAt, now);
  const daysToDeadline = deadline ? daysBetween(now, deadline) : null;

  let impliedDailyRate: number | null = null;
  if (daysElapsed !== null && daysElapsed > 0) {
    impliedDailyRate = round2(currentValue / daysElapsed);
  }

  let projectedValue: number | null = null;
  let onTrack: boolean | null = null;
  if (impliedDailyRate !== null && daysToDeadline !== null) {
    projectedValue = round2(currentValue + impliedDailyRate * daysToDeadline);
    if (targetValue && targetValue > 0) {
      onTrack = projectedValue >= targetValue;
    }
  }

  return {
    progressPercent,
    daysElapsed,
    daysToDeadline,
    impliedDailyRate,
    projectedValue,
    onTrack,
  };
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / MS_PER_DAY);
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// LLM output parsing
// ---------------------------------------------------------------------------

/**
 * Extract the first JSON object from an LLM reply, tolerating ```json fences and
 * surrounding prose. Throws if none is found or it does not parse.
 */
export function extractJsonObject<T = Record<string, unknown>>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const match = candidate.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('No JSON object found in LLM response');
  }
  return JSON.parse(match[0]) as T;
}

/** Clamp to an integer within [min,max]; throws if not a finite number. */
export function clampInt(value: unknown, min: number, max: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Expected a number, got ${JSON.stringify(value)}`);
  }
  return Math.max(min, Math.min(max, Math.round(n)));
}
