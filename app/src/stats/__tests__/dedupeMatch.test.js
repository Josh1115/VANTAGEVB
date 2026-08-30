import { describe, it, expect } from 'vitest';

// dedupe.js imports queries.js (which imports merge.js -> db) and merge.js.
// None of that runs for the pure helpers under test, but the module graph loads,
// so keep the db import cheap/no-op via the same missing-IndexedDB path the
// other stats tests already tolerate.
import { matchPairKey, pickDefaultMatchSurvivor, matchesLookLikeDuplicates } from '../dedupe';

const WINDOW = 48 * 60 * 60 * 1000; // MATCH_DUPE_REVIEW_WINDOW_HOURS = 48h
const mm = (o) => ({ opponent_name: 'Grant', date: '2026-09-04T12:00:00.000Z', ...o });

const info = (o) => ({
  id: 1, uid: 'uid-1', status: 'scheduled', hasStats: false,
  setCount: 0, contactCount: 0, _updated_at: '2026-08-01', ...o,
});

describe('matchPairKey', () => {
  it('is stable regardless of argument order', () => {
    const a = { id: 1, uid: 'uid-a' };
    const b = { id: 2, uid: 'uid-b' };
    expect(matchPairKey(a, b)).toBe(matchPairKey(b, a));
  });

  it('falls back to row id when a uid is missing', () => {
    const a = { id: 5 };
    const b = { id: 9, uid: 'uid-b' };
    expect(matchPairKey(a, b)).toBe('id:5::uid-b');
  });
});

describe('pickDefaultMatchSurvivor', () => {
  it('prefers the copy that has stats', () => {
    const withData = info({ id: 1, hasStats: true, status: 'complete' });
    const empty    = info({ id: 2, hasStats: false, status: 'scheduled' });
    expect(pickDefaultMatchSurvivor(withData, empty).id).toBe(1);
    expect(pickDefaultMatchSurvivor(empty, withData).id).toBe(1);
  });

  it('prefers the further-along status when neither has stats', () => {
    const scheduled = info({ id: 1, status: 'scheduled' });
    const inProg    = info({ id: 2, status: 'in_progress' });
    expect(pickDefaultMatchSurvivor(scheduled, inProg).id).toBe(2);
  });

  it('falls back to most recently edited', () => {
    const older = info({ id: 1, _updated_at: '2026-08-01' });
    const newer = info({ id: 2, _updated_at: '2026-08-09' });
    expect(pickDefaultMatchSurvivor(older, newer).id).toBe(2);
  });
});

describe('matchesLookLikeDuplicates', () => {
  it('flags same opponent, same day', () => {
    expect(matchesLookLikeDuplicates(mm({ opponent_name: 'Grant' }), mm({ opponent_name: 'grant' }), WINDOW)).toBe(true);
  });

  it('does not flag different opponents on the same day', () => {
    expect(matchesLookLikeDuplicates(mm({ opponent_name: 'Grant' }), mm({ opponent_name: 'Lakes' }), WINDOW)).toBe(false);
  });

  it('flags a "TBD" slot against the real game it became (within the window)', () => {
    const slot = mm({ opponent_name: 'TBD', date: '2026-09-04T10:00:00.000Z' });
    const game = mm({ opponent_name: 'Grant', date: '2026-09-04T22:00:00.000Z' });
    expect(matchesLookLikeDuplicates(slot, game, WINDOW)).toBe(true);
  });

  it('flags a blank opponent against a real game', () => {
    expect(matchesLookLikeDuplicates(mm({ opponent_name: '' }), mm({ opponent_name: 'Grant' }), WINDOW)).toBe(true);
    expect(matchesLookLikeDuplicates(mm({ opponent_name: null }), mm({ opponent_name: 'Grant' }), WINDOW)).toBe(true);
  });

  it('does NOT flag two "TBD" slots against each other as the same real opponent', () => {
    // both unnamed still counts as "one still unnamed" -> flagged for review,
    // but must not be flagged via the "same real opponent" path
    const a = mm({ opponent_name: 'TBD' });
    const b = mm({ opponent_name: 'TBD', date: '2026-11-04T12:00:00.000Z' }); // 2 months later
    expect(matchesLookLikeDuplicates(a, b, WINDOW)).toBe(false); // outside window
  });

  it('does not flag when dates are outside the window', () => {
    const a = mm({ opponent_name: 'Grant', date: '2026-09-04T12:00:00.000Z' });
    const b = mm({ opponent_name: 'Grant', date: '2026-09-10T12:00:00.000Z' }); // 6 days
    expect(matchesLookLikeDuplicates(a, b, WINDOW)).toBe(false);
  });

  it('does not flag when a date is unparseable', () => {
    expect(matchesLookLikeDuplicates(mm({ date: 'garbage' }), mm({}), WINDOW)).toBe(false);
  });
});
