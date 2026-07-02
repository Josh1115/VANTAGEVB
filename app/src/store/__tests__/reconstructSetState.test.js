/**
 * Unit tests for reconstructSetState — rebuilds live-set state from persisted
 * rows on LiveMatchPage mount (between-sets round trip + mid-set app reload).
 */
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../db/schema', () => ({
  db: {
    matches: { update: vi.fn().mockResolvedValue(undefined) },
  },
}));

vi.mock('../../store/uiStore', () => ({
  useUiStore: { getState: () => ({ showToast: vi.fn() }) },
}));

import { reconstructSetState } from '../matchStore';

const PLAYERS = {
  7: { id: 7, name: 'Ann Ace',   jersey_number: 7,  position: 'OH' },
  9: { id: 9, name: 'Bea Block', jersey_number: 9,  position: 'MB' },
};

function makeLineup() {
  return Array.from({ length: 6 }, (_, i) => ({
    position:      i + 1,
    serveOrder:    i + 1,
    playerId:      i + 1,
    playerName:    `P${i + 1}`,
    jersey:        String(i + 1),
    positionLabel: 'OH',
  }));
}

function base(overrides = {}) {
  return {
    setRow:       { id: 50, set_number: 1 },
    allSets:      [{ id: 50, set_number: 1, status: 'in_progress' }],
    rallies:      [],
    timeoutRows:  [],
    subRows:      [],
    baseLineup:   makeLineup(),
    baseRotation: 1,
    playersById:  PLAYERS,
    format:       'best_of_3',
    lastSetScore: 15,
    ...overrides,
  };
}

const rally = (id, serve_side, point_winner, our_rotation, extra = {}) =>
  ({ id, set_id: 50, rally_number: id - 1, serve_side, point_winner, our_rotation, ...extra });

describe('reconstructSetState', () => {
  it('fresh set: zeros, serving_first respected, base rotation kept', () => {
    const out = reconstructSetState(base({
      setRow: { id: 50, set_number: 2, serving_first: 'them' },
      baseRotation: 3,
    }));
    expect(out.ourScore).toBe(0);
    expect(out.oppScore).toBe(0);
    expect(out.setNumber).toBe(2);
    expect(out.serveSide).toBe('them');
    expect(out.rotationNum).toBe(3);
    expect(out.rallyCount).toBe(0);
    expect(out.pendingSetWin).toBeNull();
    expect(out.currentRun).toEqual({ side: null, count: 0 });
  });

  it('fresh set without serving_first defaults to us', () => {
    const out = reconstructSetState(base());
    expect(out.serveSide).toBe('us');
  });

  it('counts sets won from completed sets, excluding the current set', () => {
    const out = reconstructSetState(base({
      setRow: { id: 52, set_number: 3 },
      allSets: [
        { id: 50, set_number: 1, status: 'complete', winner: 'us' },
        { id: 51, set_number: 2, status: 'complete', winner: 'them' },
        { id: 52, set_number: 3, status: 'in_progress' },
      ],
    }));
    expect(out.ourSetsWon).toBe(1);
    expect(out.oppSetsWon).toBe(1);
    expect(out.setNumber).toBe(3);
  });

  it('rebuilds score, serve side, run, and history from rallies', () => {
    const out = reconstructSetState(base({
      rallies: [
        rally(1, 'us',   'us',   1),
        rally(2, 'us',   'them', 1),
        rally(3, 'them', 'them', 1),
        rally(4, 'them', 'them', 1),
      ],
    }));
    expect(out.ourScore).toBe(1);
    expect(out.oppScore).toBe(3);
    expect(out.rallyCount).toBe(4);
    expect(out.serveSide).toBe('them');          // last winner serves next
    expect(out.currentRun).toEqual({ side: 'them', count: 3 });
    expect(out.pointHistory.map(p => p.side)).toEqual(['us', 'them', 'them', 'them']);
    expect(out.committedRallies).toHaveLength(4);
  });

  it('advances rotation and lineup after a sideout win', () => {
    const out = reconstructSetState(base({
      rallies: [rally(1, 'them', 'us', 1)],       // sideout win → we rotate
    }));
    expect(out.rotationNum).toBe(2);
    // Forward rotation: player from position 2 now stands at position 1
    expect(out.lineup[0].playerId).toBe(2);
    expect(out.lineup[5].playerId).toBe(1);
    expect(out.serveSide).toBe('us');
  });

  it('anchors rotation on the last rally row (respects manual rotation resets)', () => {
    const out = reconstructSetState(base({
      rallies: [
        rally(1, 'us', 'us', 4),                  // rotation manually reset to 4
        rally(2, 'us', 'them', 4),
      ],
    }));
    expect(out.rotationNum).toBe(4);
    // Arrangement offset from baseRotation 1 → 3 forward rotations
    expect(out.lineup[0].playerId).toBe(4);
  });

  it('replays substitutions by player id with roster names', () => {
    const out = reconstructSetState(base({
      subRows: [
        { player_out: 3, player_in: 9, position: 3, libero_swap: false, in_position_label: 'MB', timestamp: 100 },
      ],
    }));
    const slot = out.lineup.find(sl => sl.playerId === 9);
    expect(slot).toBeTruthy();
    expect(slot.playerName).toBe('Bea Block');
    expect(slot.positionLabel).toBe('MB');
    expect(out.lineup.some(sl => sl.playerId === 3)).toBe(false);
    expect(out.subsUsed).toBe(1);
    expect(out.subPairs).toEqual({ 3: 2, 9: 2 });
  });

  it('marks a return sub as exhausting both players', () => {
    const out = reconstructSetState(base({
      subRows: [
        { player_out: 3, player_in: 9, position: 3, libero_swap: false, timestamp: 100 },
        { player_out: 9, player_in: 3, position: 3, libero_swap: false, timestamp: 200 },
      ],
    }));
    expect(out.subsUsed).toBe(2);
    expect(out.exhaustedPlayerIds).toEqual([9, 3]);
    expect(out.lineup.some(sl => sl.playerId === 3)).toBe(true);
  });

  it('ignores libero swap rows for sub counting and lineup replay', () => {
    const out = reconstructSetState(base({
      subRows: [{ libero_swap: true, timestamp: 100 }],
    }));
    expect(out.subsUsed).toBe(0);
    expect(out.lineup.map(sl => sl.playerId)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('counts timeouts per side', () => {
    const out = reconstructSetState(base({
      timeoutRows: [{ side: 'us' }, { side: 'them' }, { side: 'us' }],
    }));
    expect(out.ourTimeouts).toBe(2);
    expect(out.oppTimeouts).toBe(1);
  });

  it('re-raises pendingSetWin when the set was already decided', () => {
    const rallies = [];
    let id = 1;
    for (let i = 0; i < 25; i++) rallies.push(rally(id++, 'us', 'us', 1));
    for (let i = 0; i < 23; i++) rallies.push(rally(id++, 'us', 'them', 1));
    const out = reconstructSetState(base({ rallies }));
    expect(out.ourScore).toBe(25);
    expect(out.oppScore).toBe(23);
    expect(out.pendingSetWin).toBe('us');
  });

  it('uses the deciding-set target score', () => {
    const rallies = [];
    let id = 1;
    for (let i = 0; i < 15; i++) rallies.push(rally(id++, 'us', 'us', 1));
    for (let i = 0; i < 10; i++) rallies.push(rally(id++, 'us', 'them', 1));
    const out = reconstructSetState(base({
      setRow: { id: 50, set_number: 3 },          // deciding set in best_of_3
      rallies,
    }));
    expect(out.pendingSetWin).toBe('us');         // 15 points wins the decider
  });
});
