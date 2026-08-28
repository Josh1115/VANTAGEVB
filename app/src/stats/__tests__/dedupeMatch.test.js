import { describe, it, expect } from 'vitest';

// dedupe.js imports queries.js (which imports merge.js -> db) and merge.js.
// None of that runs for the pure helpers under test, but the module graph loads,
// so keep the db import cheap/no-op via the same missing-IndexedDB path the
// other stats tests already tolerate.
import { matchPairKey, pickDefaultMatchSurvivor } from '../dedupe';

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
