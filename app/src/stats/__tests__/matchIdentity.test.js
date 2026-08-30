import { describe, it, expect } from 'vitest';
import { planMatchDedup, distinguishKey, pickSurvivor, convergedPlaceholderUid } from '../matchIdentity';

// ── Helpers ──────────────────────────────────────────────────────────────────

const m = (overrides) => ({
  id:               1,
  uid:              'uid-1',
  season_id:        10,
  opponent_name:    'Lincoln',
  date:             '2026-09-04T12:00:00.000Z',
  match_time:       null,
  match_type:       'regular',
  tournament_round: null,
  status:           'scheduled',
  updated_at:       '2026-08-01T00:00:00.000Z',
  ...overrides,
});

// planMatchDedup(matches, hasStats) — hasStats is a predicate over match id.
const plan = (matches, statIds = []) =>
  planMatchDedup(matches, (id) => statIds.includes(id));

// ── Part A: duplicate scheduled placeholders ─────────────────────────────────

describe('planMatchDedup — Part A (duplicate scheduled entries)', () => {
  it('folds two identical scheduled placeholders into one', () => {
    const a = m({ id: 1, uid: 'uid-aaa' });
    const b = m({ id: 2, uid: 'uid-bbb' });
    const { deletions } = plan([a, b]);
    expect(deletions).toHaveLength(1);
    expect(deletions[0].loserId).toBe(2);   // uid-bbb sorts after uid-aaa
    expect(deletions[0].survivorId).toBe(1);
    expect(deletions[0].reason).toBe('duplicate-scheduled');
  });

  it('picks the same survivor regardless of input order (deterministic)', () => {
    const a = m({ id: 1, uid: 'uid-aaa' });
    const b = m({ id: 2, uid: 'uid-bbb' });
    const c = m({ id: 3, uid: 'uid-ccc' });
    const forward  = plan([a, b, c]).deletions.map((d) => d.loserId).sort();
    const backward = plan([c, b, a]).deletions.map((d) => d.loserId).sort();
    expect(forward).toEqual([2, 3]);
    expect(backward).toEqual([2, 3]);
  });

  it('keeps two same-opponent same-day entries that have different times', () => {
    const morning   = m({ id: 1, uid: 'uid-1', match_time: '09:00' });
    const afternoon = m({ id: 2, uid: 'uid-2', match_time: '14:00' });
    expect(plan([morning, afternoon]).deletions).toHaveLength(0);
  });

  it('keeps two same-opponent entries on different days', () => {
    const sat = m({ id: 1, uid: 'uid-1', date: '2026-09-04T12:00:00.000Z' });
    const sun = m({ id: 2, uid: 'uid-2', date: '2026-09-05T12:00:00.000Z' });
    expect(plan([sat, sun]).deletions).toHaveLength(0);
  });

  it('keeps entries distinguished only by tournament round', () => {
    const pool   = m({ id: 1, uid: 'uid-1', match_type: 'tourney', tournament_round: 'pool' });
    const bracket = m({ id: 2, uid: 'uid-2', match_type: 'tourney', tournament_round: 'bracket' });
    expect(plan([pool, bracket]).deletions).toHaveLength(0);
  });

  it('collapses three identical placeholders to a single survivor', () => {
    const rows = [
      m({ id: 1, uid: 'uid-3' }),
      m({ id: 2, uid: 'uid-1' }),
      m({ id: 3, uid: 'uid-2' }),
    ];
    const { deletions } = plan(rows);
    expect(deletions).toHaveLength(2);
    expect(deletions.every((d) => d.survivorId === 2)).toBe(true); // uid-1 wins
    expect(deletions.map((d) => d.loserId).sort()).toEqual([1, 3]);
  });

  it('matches opponent names case- and whitespace-insensitively', () => {
    const a = m({ id: 1, uid: 'uid-1', opponent_name: 'Lincoln' });
    const b = m({ id: 2, uid: 'uid-2', opponent_name: '  lincoln ' });
    expect(plan([a, b]).deletions).toHaveLength(1);
  });
});

// ── Part B: scheduled entry left behind after the game was played ─────────────

describe('planMatchDedup — Part B (scheduled + already played)', () => {
  it('drops a scheduled placeholder when the game has been completed', () => {
    const scheduled = m({ id: 1, uid: 'uid-1', status: 'scheduled' });
    const complete  = m({ id: 2, uid: 'uid-2', status: 'complete' });
    const { deletions } = plan([scheduled, complete], [2]);
    expect(deletions).toHaveLength(1);
    expect(deletions[0].loserId).toBe(1);
    expect(deletions[0].survivorId).toBe(2);
    expect(deletions[0].reason).toBe('scheduled-already-played');
  });

  it('drops a scheduled placeholder when the game is in progress', () => {
    const scheduled  = m({ id: 1, uid: 'uid-1', status: 'scheduled' });
    const inProgress = m({ id: 2, uid: 'uid-2', status: 'in_progress' });
    expect(plan([scheduled, inProgress], [2]).deletions).toHaveLength(1);
  });

  it('never deletes the played game itself', () => {
    const scheduled = m({ id: 1, uid: 'uid-1', status: 'scheduled' });
    const complete  = m({ id: 2, uid: 'uid-2', status: 'complete' });
    const { deletions } = plan([scheduled, complete], [2]);
    expect(deletions.some((d) => d.loserId === 2)).toBe(false);
  });

  it('does NOT drop a scheduled placeholder on a different day from the played game', () => {
    const scheduled = m({ id: 1, uid: 'uid-1', status: 'scheduled', date: '2026-09-04T12:00:00.000Z' });
    const complete  = m({ id: 2, uid: 'uid-2', status: 'complete',  date: '2026-09-06T12:00:00.000Z' });
    expect(plan([scheduled, complete], [2]).deletions).toHaveLength(0);
  });

  it('keeps a future scheduled rematch when an earlier game vs the same team is done (back-to-back)', () => {
    const playedSat    = m({ id: 1, uid: 'uid-1', status: 'complete',  date: '2026-09-04T12:00:00.000Z' });
    const scheduledSun = m({ id: 2, uid: 'uid-2', status: 'scheduled', date: '2026-09-05T12:00:00.000Z' });
    expect(plan([playedSat, scheduledSun], [1]).deletions).toHaveLength(0);
  });

  it('does not touch a placeholder when two played games share the same opponent and day (doubleheader)', () => {
    const scheduled = m({ id: 1, uid: 'uid-1', status: 'scheduled' });
    const game1     = m({ id: 2, uid: 'uid-2', status: 'complete', match_time: '09:00' });
    const game2     = m({ id: 3, uid: 'uid-3', status: 'complete', match_time: '14:00' });
    expect(plan([scheduled, game1, game2], [2, 3]).deletions).toHaveLength(0);
  });

  it('folds multiple leftover placeholders into one played game', () => {
    const sched1   = m({ id: 1, uid: 'uid-1', status: 'scheduled' });
    const sched2   = m({ id: 2, uid: 'uid-2', status: 'scheduled' });
    const complete = m({ id: 3, uid: 'uid-3', status: 'complete' });
    const { deletions } = plan([sched1, sched2, complete], [3]);
    expect(deletions).toHaveLength(2);
    expect(deletions.map((d) => d.loserId).sort()).toEqual([1, 2]);
    expect(deletions.every((d) => d.survivorId === 3)).toBe(true);
  });

  it('respects an explicit time disagreement between placeholder and played game', () => {
    const scheduled = m({ id: 1, uid: 'uid-1', status: 'scheduled', match_time: '09:00' });
    const complete  = m({ id: 2, uid: 'uid-2', status: 'complete',  match_time: '14:00' });
    expect(plan([scheduled, complete], [2]).deletions).toHaveLength(0);
  });
});

// ── Part C: "TBD" tournament slots that got assigned ─────────────────────────

describe('planMatchDedup — Part C (TBD tournament slots)', () => {
  const tbd    = (o) => m({ ...o, opponent_name: 'TBD', status: 'scheduled' });
  const played = (o) => m({ ...o, status: 'complete' });

  it('drops a leftover "TBD" slot when its game was played at the same start time', () => {
    const slot = tbd({ id: 1, uid: 'uid-1', match_time: '10:00' });
    const game = played({ id: 2, uid: 'uid-2', opponent_name: 'Grant', match_time: '10:00' });
    const { deletions } = plan([slot, game], [2]);
    expect(deletions).toHaveLength(1);
    expect(deletions[0].loserId).toBe(1);
    expect(deletions[0].survivorId).toBe(2);
    expect(deletions[0].reason).toBe('tbd-slot-assigned');
  });

  it('clears a whole tournament: 5 "TBD" slots at 5 times, 5 games played at those times', () => {
    const times = ['09:00', '11:00', '13:00', '15:00', '17:00'];
    const slots = times.map((t, i) => tbd({ id: i + 1, uid: `s${i}`, match_time: t }));
    const games = times.map((t, i) => played({ id: i + 11, uid: `g${i}`, opponent_name: `Opp ${i}`, match_time: t }));
    const statIds = games.map((g) => g.id);
    const { deletions } = plan([...slots, ...games], statIds);
    expect(deletions).toHaveLength(5);
    expect(deletions.map((d) => d.loserId).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
    expect(deletions.some((d) => statIds.includes(d.loserId))).toBe(false); // never a real game
  });

  it('keeps a "TBD" slot that has NO game at its time (a genuine unassigned game)', () => {
    const slot = tbd({ id: 1, uid: 'uid-1', match_time: '10:00' });
    const game = played({ id: 2, uid: 'uid-2', opponent_name: 'Grant', match_time: '14:00' });
    expect(plan([slot, game], [2]).deletions).toHaveLength(0);
  });

  it('keeps a lone "TBD" slot with nothing else that day', () => {
    const slot = tbd({ id: 1, uid: 'uid-1', match_time: '10:00' });
    expect(plan([slot], []).deletions).toHaveLength(0);
  });

  it('does not fold a "TBD" slot with no start time (cannot pair it safely)', () => {
    const slot = tbd({ id: 1, uid: 'uid-1', match_time: null });
    const game = played({ id: 2, uid: 'uid-2', opponent_name: 'Grant', match_time: null });
    expect(plan([slot, game], [2]).deletions).toHaveLength(0);
  });

  it('folds a "TBD" slot into a real game that is renamed but not yet played', () => {
    const slot    = tbd({ id: 1, uid: 'uid-1', match_time: '10:00' });
    const renamed = m({ id: 2, uid: 'uid-2', opponent_name: 'Grant', status: 'scheduled', match_time: '10:00' });
    const { deletions } = plan([slot, renamed], []);
    expect(deletions).toHaveLength(1);
    expect(deletions[0].loserId).toBe(1);
  });

  it('does not fold when two non-blank games share the slot time', () => {
    const slot  = tbd({ id: 1, uid: 'uid-1', match_time: '10:00' });
    const gameA = played({ id: 2, uid: 'uid-2', opponent_name: 'Grant', match_time: '10:00' });
    const gameB = played({ id: 3, uid: 'uid-3', opponent_name: 'Lakes', match_time: '10:00' });
    expect(plan([slot, gameA, gameB], [2, 3]).deletions).toHaveLength(0);
  });

  it('treats "tbd" / "TBD" / " Tbd " all as unassigned', () => {
    for (const label of ['tbd', 'TBD', ' Tbd ']) {
      const slot = m({ id: 1, uid: 'uid-1', opponent_name: label, status: 'scheduled', match_time: '10:00' });
      const game = m({ id: 2, uid: 'uid-2', opponent_name: 'Grant', status: 'complete', match_time: '10:00' });
      expect(plan([slot, game], [2]).deletions).toHaveLength(1);
    }
  });

  it('never touches a "TBD" row that has stats (not a placeholder)', () => {
    const slotWithStats = tbd({ id: 1, uid: 'uid-1', match_time: '10:00' });
    const game          = played({ id: 2, uid: 'uid-2', opponent_name: 'Grant', match_time: '10:00' });
    // id 1 unexpectedly has stats -> it's a played game, not a deletable slot
    const { deletions } = plan([slotWithStats, game], [1, 2]);
    expect(deletions.some((d) => d.loserId === 1)).toBe(false);
  });
});

// ── Safety / guards ──────────────────────────────────────────────────────────

describe('planMatchDedup — safety', () => {
  it('never proposes deleting a match that has stats, even if status is still "scheduled"', () => {
    const a = m({ id: 1, uid: 'uid-1', status: 'scheduled' });
    const b = m({ id: 2, uid: 'uid-2', status: 'scheduled' });
    // id 2 unexpectedly has stats -> treated as played, not a deletable placeholder
    const { deletions } = plan([a, b], [2]);
    expect(deletions.some((d) => d.loserId === 2)).toBe(false);
  });

  it('returns nothing for a single clean schedule', () => {
    expect(plan([m({ id: 1 })]).deletions).toEqual([]);
  });

  it('leaves matches in different seasons alone', () => {
    const a = m({ id: 1, uid: 'uid-1', season_id: 10 });
    const b = m({ id: 2, uid: 'uid-2', season_id: 11 });
    expect(plan([a, b]).deletions).toHaveLength(0);
  });
});

// ── Low-level helpers ────────────────────────────────────────────────────────

describe('convergedPlaceholderUid', () => {
  const sched = (uid) => ({ uid, status: 'scheduled' });

  it('returns the smaller uid when the local row has the larger one', () => {
    expect(convergedPlaceholderUid(sched('uid-a'), sched('uid-b'))).toBe('uid-a');
  });

  it('returns null when the local row already holds the smaller uid', () => {
    expect(convergedPlaceholderUid(sched('uid-b'), sched('uid-a'))).toBeNull();
  });

  it('returns null when both sides already share a uid', () => {
    expect(convergedPlaceholderUid(sched('uid-a'), sched('uid-a'))).toBeNull();
  });

  it('never re-keys once either side has been played', () => {
    expect(convergedPlaceholderUid({ uid: 'uid-a', status: 'complete' }, sched('uid-b'))).toBeNull();
    expect(convergedPlaceholderUid(sched('uid-a'), { uid: 'uid-b', status: 'in_progress' })).toBeNull();
  });

  it('returns null when a uid is missing (legacy row)', () => {
    expect(convergedPlaceholderUid(sched(undefined), sched('uid-b'))).toBeNull();
    expect(convergedPlaceholderUid(sched('uid-a'), sched(null))).toBeNull();
  });

  it('returns null when there is no matched local row', () => {
    expect(convergedPlaceholderUid(sched('uid-a'), null)).toBeNull();
  });
});

describe('distinguishKey / pickSurvivor', () => {
  it('distinguishKey ignores case and surrounding whitespace in opponent name', () => {
    expect(distinguishKey(m({ opponent_name: 'Lincoln' })))
      .toBe(distinguishKey(m({ opponent_name: ' LINCOLN ' })));
  });

  it('distinguishKey separates different times', () => {
    expect(distinguishKey(m({ match_time: '09:00' })))
      .not.toBe(distinguishKey(m({ match_time: '14:00' })));
  });

  it('pickSurvivor prefers the lexically-smallest uid', () => {
    const rows = [{ id: 9, uid: 'b' }, { id: 1, uid: 'a' }, { id: 5, uid: 'c' }];
    expect(pickSurvivor(rows).uid).toBe('a');
  });

  it('pickSurvivor falls back to updated_at then id when uid is missing', () => {
    const rows = [
      { id: 9, updated_at: '2026-01-02' },
      { id: 3, updated_at: '2026-01-01' },
    ];
    expect(pickSurvivor(rows).id).toBe(3);
  });
});
