// Pin the runner to a US timezone so the "local calendar day" behavior these
// helpers rely on is exercised (not just the UTC-equals-local degenerate case).
// Node re-reads process.env.TZ on the next Date operation.
process.env.TZ = 'America/Chicago';

import { describe, it, expect } from 'vitest';
import {
  matchDateISO,
  todayLocalDateStr,
  todayMatchDateISO,
  matchDay,
  normalizeMatchDate,
} from '../matchDate';

// Sanity: confirm the timezone pin actually took effect (Chicago is UTC-5/-6),
// otherwise the local-day assertions below would be silently meaningless.
describe('test environment', () => {
  it('is running in US Central time', () => {
    const d = new Date('2026-08-25T00:00:00.000Z'); // midnight UTC
    expect(d.getDate()).toBe(24);                    // = 7pm the previous day, CDT
  });
});

describe('matchDateISO', () => {
  it('anchors a plain YYYY-MM-DD to noon UTC', () => {
    expect(matchDateISO('2026-08-25')).toBe('2026-08-25T12:00:00.000Z');
  });

  it('strips a time component off a full ISO string and re-anchors to noon UTC', () => {
    expect(matchDateISO('2026-08-25T19:30:00.000Z')).toBe('2026-08-25T12:00:00.000Z');
    expect(matchDateISO('2026-08-25T02:00:00.000Z')).toBe('2026-08-25T12:00:00.000Z');
  });

  it('is stable across timezones — the same day always yields the same string', () => {
    // This is the whole point: two devices, any timezones, one game → one string.
    expect(matchDateISO('2026-08-25')).toBe('2026-08-25T12:00:00.000Z');
  });

  it('falls back to today (local calendar day) for empty / unparseable input', () => {
    const todayNoon = `${todayLocalDateStr()}T12:00:00.000Z`;
    expect(matchDateISO('')).toBe(todayNoon);
    expect(matchDateISO(null)).toBe(todayNoon);
    expect(matchDateISO(undefined)).toBe(todayNoon);
    expect(matchDateISO('not-a-date')).toBe(todayNoon);
  });
});

describe('todayLocalDateStr', () => {
  it('uses the LOCAL calendar day, so an evening game does not roll to tomorrow', () => {
    // 1:30am UTC on Aug 26 == 8:30pm Central on Aug 25. A coach starting a game
    // then should get Aug 25, not Aug 26.
    const evening = new Date('2026-08-26T01:30:00.000Z');
    expect(todayLocalDateStr(evening)).toBe('2026-08-25');
  });

  it('zero-pads month and day', () => {
    expect(todayLocalDateStr(new Date('2026-03-05T18:00:00.000Z'))).toBe('2026-03-05');
  });
});

describe('todayMatchDateISO', () => {
  it('is today\'s local day at noon UTC', () => {
    expect(todayMatchDateISO()).toBe(`${todayLocalDateStr()}T12:00:00.000Z`);
  });
});

describe('matchDay', () => {
  it('returns the YYYY-MM-DD portion', () => {
    expect(matchDay('2026-08-25T12:00:00.000Z')).toBe('2026-08-25');
  });
  it('is safe on null / undefined', () => {
    expect(matchDay(null)).toBe('');
    expect(matchDay(undefined)).toBe('');
  });
});

describe('normalizeMatchDate (the v25 migration transform)', () => {
  it('fixes an evening game whose stored date rolled forward a day', () => {
    // Quick-started at 9pm Central on Aug 25 → stored as Aug 26 02:00 UTC.
    // The coach meant Aug 25.
    expect(normalizeMatchDate('2026-08-26T02:00:00.000Z')).toBe('2026-08-25T12:00:00.000Z');
  });

  it('re-anchors a scheduled match (stored as local-noon-in-UTC) without changing its day', () => {
    // "new Date('2026-08-25T12:00:00').toISOString()" in Central → 17:00 UTC.
    expect(normalizeMatchDate('2026-08-25T17:00:00.000Z')).toBe('2026-08-25T12:00:00.000Z');
  });

  it('is idempotent — running it again on an already-normalized value is a no-op', () => {
    const once = normalizeMatchDate('2026-08-26T02:00:00.000Z');
    expect(normalizeMatchDate(once)).toBe(once);
    expect(normalizeMatchDate('2026-08-25T12:00:00.000Z')).toBe('2026-08-25T12:00:00.000Z');
  });

  it('leaves null / empty / unparseable values untouched', () => {
    expect(normalizeMatchDate(null)).toBe(null);
    expect(normalizeMatchDate('')).toBe('');
    expect(normalizeMatchDate('garbage')).toBe('garbage');
  });

  it('two copies of one game created via different paths converge to the same string', () => {
    const scheduledCopy = '2026-08-25T17:00:00.000Z'; // scheduled on a laptop
    const playedCopy    = '2026-08-26T02:00:00.000Z'; // quick-started that night on an iPad
    expect(normalizeMatchDate(scheduledCopy)).toBe(normalizeMatchDate(playedCopy));
  });
});
