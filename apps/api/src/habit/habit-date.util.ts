const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** UTC midnight for the given instant — the value stored in a @db.Date column. */
export function toUtcDateOnly(instant: Date = new Date()): Date {
  return new Date(
    Date.UTC(
      instant.getUTCFullYear(),
      instant.getUTCMonth(),
      instant.getUTCDate(),
    ),
  );
}

/** "YYYY-MM-DD" key for a Date, in UTC. */
export function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Streak = consecutive calendar days with a check-in, ending at today (if
 * checked in today) or yesterday (streak still "alive"). Older latest log => 0.
 * Pure function so it is unit-testable without a DB.
 */
export function computeStreak(
  logDates: Date[],
  today: Date,
): { currentStreak: number; lastLogDate: string | null; checkedInToday: boolean } {
  if (logDates.length === 0) {
    return { currentStreak: 0, lastLogDate: null, checkedInToday: false };
  }

  const keys = Array.from(new Set(logDates.map(toDateKey))).sort().reverse();
  const todayKey = toDateKey(today);
  const yesterdayKey = toDateKey(new Date(today.getTime() - MS_PER_DAY));
  const lastLogDate = keys[0];
  const checkedInToday = keys[0] === todayKey;

  let anchorKey: string;
  if (keys[0] === todayKey) {
    anchorKey = todayKey;
  } else if (keys[0] === yesterdayKey) {
    anchorKey = yesterdayKey;
  } else {
    // Latest check-in is older than yesterday — streak is broken.
    return { currentStreak: 0, lastLogDate, checkedInToday: false };
  }

  const keySet = new Set(keys);
  let streak = 0;
  let cursor = new Date(`${anchorKey}T00:00:00.000Z`);
  while (keySet.has(toDateKey(cursor))) {
    streak += 1;
    cursor = new Date(cursor.getTime() - MS_PER_DAY);
  }

  return { currentStreak: streak, lastLogDate, checkedInToday };
}
