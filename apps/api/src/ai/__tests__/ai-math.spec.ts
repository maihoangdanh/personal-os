import {
  clampInt,
  computeFreeSlots,
  eisenhowerQuadrant,
  extractJsonObject,
  Interval,
  periodRange,
  priorityScore,
  projectTarget,
  weekStart,
  workingWindows,
} from '../ai-math';

describe('priority / Eisenhower', () => {
  it('priorityScore = impact × urgency', () => {
    expect(priorityScore(3, 4)).toBe(12);
    expect(priorityScore(5, 5)).toBe(25);
  });

  it('maps quadrants at threshold >= 3', () => {
    expect(eisenhowerQuadrant(5, 5)).toBe('DO_NOW');
    expect(eisenhowerQuadrant(3, 3)).toBe('DO_NOW');
    expect(eisenhowerQuadrant(5, 1)).toBe('SCHEDULE');
    expect(eisenhowerQuadrant(1, 5)).toBe('DELEGATE');
    expect(eisenhowerQuadrant(2, 2)).toBe('ELIMINATE');
  });
});

describe('periodRange', () => {
  it('DAILY covers a single UTC day', () => {
    const r = periodRange('DAILY', new Date('2026-07-18T09:30:00Z'));
    expect(r.periodStart.toISOString().slice(0, 10)).toBe('2026-07-18');
    expect(r.periodEnd.toISOString().slice(0, 10)).toBe('2026-07-18');
    expect(r.from.toISOString()).toBe('2026-07-18T00:00:00.000Z');
    expect(r.to.toISOString()).toBe('2026-07-18T23:59:59.999Z');
  });

  it('WEEKLY spans Monday..Sunday of the ISO week', () => {
    // 2026-07-18 is a Saturday -> week is Mon 13th .. Sun 19th
    const r = periodRange('WEEKLY', new Date('2026-07-18T00:00:00Z'));
    expect(r.periodStart.toISOString().slice(0, 10)).toBe('2026-07-13');
    expect(r.periodEnd.toISOString().slice(0, 10)).toBe('2026-07-19');
  });

  it('MONTHLY spans the first..last day of the month', () => {
    const r = periodRange('MONTHLY', new Date('2026-07-18T00:00:00Z'));
    expect(r.periodStart.toISOString().slice(0, 10)).toBe('2026-07-01');
    expect(r.periodEnd.toISOString().slice(0, 10)).toBe('2026-07-31');
  });

  it('weekStart returns the UTC Monday', () => {
    expect(weekStart(new Date('2026-07-18T00:00:00Z')).toISOString().slice(0, 10)).toBe(
      '2026-07-13',
    );
    expect(weekStart(new Date('2026-07-13T00:00:00Z')).toISOString().slice(0, 10)).toBe(
      '2026-07-13',
    );
  });
});

describe('computeFreeSlots', () => {
  const window: Interval[] = [
    { start: new Date('2026-07-18T08:00:00Z'), end: new Date('2026-07-18T18:00:00Z') },
  ];

  it('splits a working window around a busy interval', () => {
    const slots = computeFreeSlots(window, [
      { start: new Date('2026-07-18T10:00:00Z'), end: new Date('2026-07-18T11:00:00Z') },
    ]);
    expect(slots).toHaveLength(2);
    expect(slots[0]).toMatchObject({ minutes: 120 }); // 08:00-10:00
    expect(slots[1]).toMatchObject({ minutes: 420 }); // 11:00-18:00
  });

  it('returns the whole window when nothing is busy', () => {
    const slots = computeFreeSlots(window, []);
    expect(slots).toHaveLength(1);
    expect(slots[0].minutes).toBe(600);
  });

  it('drops slots shorter than the minimum', () => {
    const slots = computeFreeSlots(window, [
      { start: new Date('2026-07-18T08:10:00Z'), end: new Date('2026-07-18T18:00:00Z') },
    ]);
    // only the 10-minute gap 08:00-08:10 remains, below the 15-min floor
    expect(slots).toHaveLength(0);
  });

  it('merges overlapping busy intervals correctly', () => {
    const slots = computeFreeSlots(window, [
      { start: new Date('2026-07-18T09:00:00Z'), end: new Date('2026-07-18T12:00:00Z') },
      { start: new Date('2026-07-18T11:00:00Z'), end: new Date('2026-07-18T13:00:00Z') },
    ]);
    expect(slots).toHaveLength(2);
    expect(slots[0].minutes).toBe(60); // 08:00-09:00
    expect(slots[1].minutes).toBe(300); // 13:00-18:00
  });
});

describe('workingWindows', () => {
  it('builds one 08:00-18:00 UTC window per day', () => {
    const w = workingWindows(new Date('2026-07-18T00:00:00Z'), 2);
    expect(w).toHaveLength(2);
    expect(w[0].start.toISOString()).toBe('2026-07-18T08:00:00.000Z');
    expect(w[0].end.toISOString()).toBe('2026-07-18T18:00:00.000Z');
    expect(w[1].start.toISOString()).toBe('2026-07-19T08:00:00.000Z');
  });
});

describe('projectTarget', () => {
  const now = new Date('2026-07-18T00:00:00Z');

  it('projects on-track when the implied rate reaches target', () => {
    const p = projectTarget(
      50,
      100,
      new Date('2026-07-08T00:00:00Z'), // 10 days ago
      new Date('2026-07-28T00:00:00Z'), // 10 days ahead
      now,
    );
    expect(p.progressPercent).toBe(50);
    expect(p.daysElapsed).toBe(10);
    expect(p.daysToDeadline).toBe(10);
    expect(p.impliedDailyRate).toBe(5);
    expect(p.projectedValue).toBe(100);
    expect(p.onTrack).toBe(true);
  });

  it('flags at-risk when the rate falls short', () => {
    const p = projectTarget(
      20,
      100,
      new Date('2026-07-08T00:00:00Z'),
      new Date('2026-07-28T00:00:00Z'),
      now,
    );
    expect(p.projectedValue).toBe(40); // 20 + 2/day * 10
    expect(p.onTrack).toBe(false);
  });

  it('handles a missing target (progress 0, onTrack unknown)', () => {
    const p = projectTarget(20, null, new Date('2026-07-08T00:00:00Z'), null, now);
    expect(p.progressPercent).toBe(0);
    expect(p.onTrack).toBeNull();
    expect(p.daysToDeadline).toBeNull();
  });
});

describe('extractJsonObject', () => {
  it('parses a bare JSON object', () => {
    expect(extractJsonObject('{"impact":4,"urgency":3}')).toEqual({ impact: 4, urgency: 3 });
  });

  it('parses a fenced ```json block with surrounding prose', () => {
    const raw = 'Đây là kết quả:\n```json\n{"impact":5,"urgency":2,"reason":"x"}\n```\nHết.';
    expect(extractJsonObject(raw)).toEqual({ impact: 5, urgency: 2, reason: 'x' });
  });

  it('throws when there is no object', () => {
    expect(() => extractJsonObject('no json here')).toThrow();
  });
});

describe('clampInt', () => {
  it('clamps and rounds into range', () => {
    expect(clampInt(7, 1, 5)).toBe(5);
    expect(clampInt(0, 1, 5)).toBe(1);
    expect(clampInt(3.4, 1, 5)).toBe(3);
    expect(clampInt('4', 1, 5)).toBe(4);
  });

  it('throws on non-numbers', () => {
    expect(() => clampInt('abc', 1, 5)).toThrow();
    expect(() => clampInt(undefined, 1, 5)).toThrow();
    expect(() => clampInt({}, 1, 5)).toThrow();
  });
});
