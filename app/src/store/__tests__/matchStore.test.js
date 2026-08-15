/**
 * Unit tests for core matchStore actions:
 *   rotateForward, addPoint, undoLast (point_us / point_them / fudge),
 *   recordContact, swapLibero
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../db/schema', () => ({
  db: {
    contacts: {
      add:    vi.fn().mockResolvedValue(42),
      delete: vi.fn().mockResolvedValue(undefined),
      update: vi.fn().mockResolvedValue(undefined),
    },
    rallies: {
      add:    vi.fn().mockResolvedValue(99),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    substitutions: {
      add:    vi.fn().mockResolvedValue(7),
      delete: vi.fn().mockResolvedValue(undefined),
    },
    sets: {
      update: vi.fn().mockResolvedValue(undefined),
    },
  },
}));

vi.mock('../../store/uiStore', () => ({
  useUiStore: {
    getState: () => ({ showToast: vi.fn() }),
  },
}));

vi.mock('../../utils/storage', () => ({
  getIntStorage:  vi.fn().mockReturnValue(NaN),
  STORAGE_KEYS:   { MAX_SUBS: 'vbstat_max_subs' },
}));

// ── Subject under test ───────────────────────────────────────────────────────

import { useMatchStore } from '../matchStore';
import { db } from '../../db/schema';
import { SIDE } from '../../constants';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function initMatch() {
  useMatchStore.getState().resetMatch();
  useMatchStore.getState().setMatch(1, 1, 1, 'best_of_3', 15);
}

/** Build a 6-player lineup with real playerIds (10–15), MB at index 4. */
function makeLineup() {
  return Array.from({ length: 6 }, (_, i) => ({
    position:       i + 1,
    serveOrder:     i + 1,
    playerId:       i + 10,
    playerName:     `Player${i + 1}`,
    jersey:         String(i + 1),
    positionLabel:  i === 4 ? 'MB' : 'OH',
  }));
}

function loadLineup() {
  useMatchStore.getState().setLineup(makeLineup());
}

// ── rotateForward ─────────────────────────────────────────────────────────────

describe('rotateForward', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initMatch();
    loadLineup();
  });

  it('position 1 receives the player that was in position 2', () => {
    useMatchStore.getState().rotateForward();
    const lineup = useMatchStore.getState().lineup;
    expect(lineup[0].serveOrder).toBe(2);
    expect(lineup[0].playerId).toBe(11); // makeLineup()[1].playerId
  });

  it('position 6 wraps to receive the player from position 1', () => {
    useMatchStore.getState().rotateForward();
    const lineup = useMatchStore.getState().lineup;
    expect(lineup[5].serveOrder).toBe(1);
    expect(lineup[5].playerId).toBe(10);
  });

  it('six full rotations return the lineup to its original order', () => {
    const before = useMatchStore.getState().lineup.map((s) => s.playerId);
    for (let i = 0; i < 6; i++) useMatchStore.getState().rotateForward();
    const after = useMatchStore.getState().lineup.map((s) => s.playerId);
    expect(after).toEqual(before);
  });
});

// ── addPoint — score and metadata ────────────────────────────────────────────

describe('addPoint — score tracking', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initMatch();
  });

  it('SIDE.US increments ourScore', async () => {
    await useMatchStore.getState().addPoint(SIDE.US);
    expect(useMatchStore.getState().ourScore).toBe(1);
    expect(useMatchStore.getState().oppScore).toBe(0);
  });

  it('SIDE.THEM increments oppScore', async () => {
    await useMatchStore.getState().addPoint(SIDE.THEM);
    expect(useMatchStore.getState().ourScore).toBe(0);
    expect(useMatchStore.getState().oppScore).toBe(1);
  });

  it('rallyCount increments on each point', async () => {
    await useMatchStore.getState().addPoint(SIDE.US);
    await useMatchStore.getState().addPoint(SIDE.US);
    expect(useMatchStore.getState().rallyCount).toBe(2);
  });

  it('each point appends a record to pointHistory', async () => {
    await useMatchStore.getState().addPoint(SIDE.US);
    await useMatchStore.getState().addPoint(SIDE.THEM);
    const { pointHistory } = useMatchStore.getState();
    expect(pointHistory).toHaveLength(2);
    expect(pointHistory[0].side).toBe(SIDE.US);
    expect(pointHistory[1].side).toBe(SIDE.THEM);
  });

  it('writes a rally row to the DB', async () => {
    await useMatchStore.getState().addPoint(SIDE.US);
    expect(db.rallies.add).toHaveBeenCalledTimes(1);
    expect(db.rallies.add).toHaveBeenCalledWith(
      expect.objectContaining({ point_winner: SIDE.US })
    );
  });
});

// ── addPoint — serve side and rotation ───────────────────────────────────────

describe('addPoint — serve side and rotation', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initMatch();
    loadLineup();
  });

  it('scoring while serving keeps serveSide as US', async () => {
    await useMatchStore.getState().addPoint(SIDE.US);
    expect(useMatchStore.getState().serveSide).toBe(SIDE.US);
  });

  it('opponent scoring switches serveSide to THEM', async () => {
    await useMatchStore.getState().addPoint(SIDE.THEM);
    expect(useMatchStore.getState().serveSide).toBe(SIDE.THEM);
  });

  it('sideout (THEM serving → US scores) rotates lineup and flips serveSide', async () => {
    const beforeLineup = useMatchStore.getState().lineup.map((s) => s.playerId);
    await useMatchStore.getState().addPoint(SIDE.THEM); // give serve to THEM
    await useMatchStore.getState().addPoint(SIDE.US);   // win sideout → rotate
    const afterLineup = useMatchStore.getState().lineup.map((s) => s.playerId);
    expect(afterLineup[0]).toBe(beforeLineup[1]);       // position 1 got position 2's player
    expect(useMatchStore.getState().serveSide).toBe(SIDE.US);
  });

  it('no rotation when scoring while already serving', async () => {
    const beforeLineup = useMatchStore.getState().lineup.map((s) => s.playerId);
    await useMatchStore.getState().addPoint(SIDE.US);
    const afterLineup = useMatchStore.getState().lineup.map((s) => s.playerId);
    expect(afterLineup).toEqual(beforeLineup);
  });
});

// ── undoLast ─────────────────────────────────────────────────────────────────

describe('undoLast', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initMatch();
  });

  it('empty history: resolves without throwing', async () => {
    await expect(useMatchStore.getState().undoLast()).resolves.not.toThrow();
    expect(useMatchStore.getState().actionHistory).toHaveLength(0);
  });

  it('undoes ourScore after addPoint(SIDE.US)', async () => {
    await useMatchStore.getState().addPoint(SIDE.US);
    expect(useMatchStore.getState().ourScore).toBe(1);
    await useMatchStore.getState().undoLast();
    expect(useMatchStore.getState().ourScore).toBe(0);
    expect(useMatchStore.getState().actionHistory).toHaveLength(0);
  });

  it('undoes oppScore after addPoint(SIDE.THEM)', async () => {
    await useMatchStore.getState().addPoint(SIDE.THEM);
    await useMatchStore.getState().undoLast();
    expect(useMatchStore.getState().oppScore).toBe(0);
  });

  it('restores serveSide after undoing a side-switch', async () => {
    await useMatchStore.getState().addPoint(SIDE.THEM); // flips serveSide to THEM
    await useMatchStore.getState().undoLast();
    expect(useMatchStore.getState().serveSide).toBe(SIDE.US);
  });

  it('successive undos each revert one point', async () => {
    await useMatchStore.getState().addPoint(SIDE.US);
    await useMatchStore.getState().addPoint(SIDE.US);
    expect(useMatchStore.getState().ourScore).toBe(2);
    await useMatchStore.getState().undoLast();
    expect(useMatchStore.getState().ourScore).toBe(1);
    await useMatchStore.getState().undoLast();
    expect(useMatchStore.getState().ourScore).toBe(0);
  });

  it('undoes a fudgeScore adjustment', async () => {
    useMatchStore.getState().fudgeScore(SIDE.US, 1);
    expect(useMatchStore.getState().ourScore).toBe(1);
    await useMatchStore.getState().undoLast();
    expect(useMatchStore.getState().ourScore).toBe(0);
  });

  it('deletes the rally row from DB when undoing a point', async () => {
    await useMatchStore.getState().addPoint(SIDE.US);
    await useMatchStore.getState().undoLast();
    expect(db.rallies.delete).toHaveBeenCalledWith(99); // mocked rallies.add returns 99
  });
});

// ── recordContact ─────────────────────────────────────────────────────────────

describe('recordContact', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initMatch();
  });

  it('writes contact to DB and returns the assigned id', async () => {
    const id = await useMatchStore.getState().recordContact({
      player_id:        5,
      action:           'serve',
      result:           'ace',
      opponent_contact: false,
    });
    expect(id).toBe(42); // db.contacts.add mock returns 42
    expect(db.contacts.add).toHaveBeenCalledTimes(1);
  });

  it('adds contact to committedContacts with the persisted id', async () => {
    await useMatchStore.getState().recordContact({ player_id: 5, action: 'serve', result: 'in' });
    const { committedContacts } = useMatchStore.getState();
    expect(committedContacts).toHaveLength(1);
    expect(committedContacts[0].id).toBe(42);
    expect(committedContacts[0].action).toBe('serve');
    expect(committedContacts[0].result).toBe('in');
  });

  it('stamps match_id and set_id from current state onto the contact', async () => {
    await useMatchStore.getState().recordContact({ player_id: 5, action: 'dig', result: 'success' });
    expect(db.contacts.add).toHaveBeenCalledWith(
      expect.objectContaining({ match_id: 1, set_id: 1, action: 'dig', result: 'success' })
    );
  });

  it('adds a history entry so the contact can be undone', async () => {
    await useMatchStore.getState().recordContact({ player_id: 5, action: 'pass', result: '3' });
    const { actionHistory } = useMatchStore.getState();
    expect(actionHistory[0]).toMatchObject({ type: 'contact', contactId: 42 });
  });
});

// ── setDigRating (DigRTG/FreeRTG tag) ───────────────────────────────────────

describe('setDigRating', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initMatch();
  });

  it('writes dig_rating to the existing contact row', async () => {
    const id = await useMatchStore.getState().recordContact({ player_id: 5, action: 'dig', result: 'success' });
    await useMatchStore.getState().setDigRating(id, 3);
    expect(db.contacts.update).toHaveBeenCalledWith(id, { dig_rating: 3 });
  });

  it('updates the matching row in committedContacts in place', async () => {
    const id = await useMatchStore.getState().recordContact({ player_id: 5, action: 'dig', result: 'freeball' });
    await useMatchStore.getState().setDigRating(id, 2);
    const { committedContacts } = useMatchStore.getState();
    expect(committedContacts).toHaveLength(1);
    expect(committedContacts[0].dig_rating).toBe(2);
    expect(committedContacts[0].result).toBe('freeball'); // untouched
  });
});

// ── swapLibero ────────────────────────────────────────────────────────────────

describe('swapLibero', () => {
  const liberoPlayer = { id: 99, name: 'Lisa Libero', jersey_number: '0' };

  beforeEach(async () => {
    vi.clearAllMocks();
    await initMatch();
    loadLineup();
    useMatchStore.getState().setLibero(99);
  });

  it('swap in: liberoOnCourt becomes true', async () => {
    await useMatchStore.getState().swapLibero(liberoPlayer, 4);
    expect(useMatchStore.getState().liberoOnCourt).toBe(true);
  });

  it('swap in: target slot is updated to the libero player', async () => {
    await useMatchStore.getState().swapLibero(liberoPlayer, 4);
    const slot = useMatchStore.getState().lineup[4];
    expect(slot.playerId).toBe(99);
    expect(slot.playerName).toBe('Lisa Libero');
    expect(slot.positionLabel).toBe('L');
  });

  it('swap in: records the replaced player for restoration', async () => {
    await useMatchStore.getState().swapLibero(liberoPlayer, 4);
    expect(useMatchStore.getState().liberoReplacedPlayerId).toBe(14); // makeLineup()[4].playerId
    expect(useMatchStore.getState().liberoReplacedName).toBe('Player5');
  });

  it('swap out: restores the replaced player and clears liberoOnCourt', async () => {
    await useMatchStore.getState().swapLibero(liberoPlayer, 4); // in
    await useMatchStore.getState().swapLibero(liberoPlayer);    // out
    const slot = useMatchStore.getState().lineup[4];
    expect(slot.playerId).toBe(14);
    expect(useMatchStore.getState().liberoOnCourt).toBe(false);
  });

  it('writes a substitution row to the DB on each swap', async () => {
    await useMatchStore.getState().swapLibero(liberoPlayer, 4);
    expect(db.substitutions.add).toHaveBeenCalledTimes(1);
    expect(db.substitutions.add).toHaveBeenCalledWith(
      expect.objectContaining({ libero_swap: true })
    );
  });
});

// ── swapLibero — IHSA two-libero rule (direct libero-for-libero swap) ─────────

describe('swapLibero — two dressed liberos', () => {
  const liberoA = { id: 99, name: 'Lisa Libero',  jersey_number: '0' };
  const liberoB = { id: 98, name: 'Bea Backup',   jersey_number: '1' };

  beforeEach(async () => {
    vi.clearAllMocks();
    await initMatch();
    loadLineup();
    useMatchStore.getState().setLibero(99, 'Lisa Libero', '0');
    useMatchStore.getState().setLibero2(98, 'Bea Backup', '1');
  });

  it('direct swap: the other dressed libero takes the on-court slot without restoring the original player', async () => {
    await useMatchStore.getState().swapLibero(liberoA, 4); // A in for the back-row player
    await useMatchStore.getState().swapLibero(liberoB);    // B takes over directly (no target idx)

    const s = useMatchStore.getState();
    expect(s.liberoOnCourt).toBe(true);
    expect(s.liberoId).toBe(98);       // B is now active
    expect(s.libero2Id).toBe(99);      // A is now the benched one
    expect(s.lineup[4].playerId).toBe(98);
    // The true original back-row player is still remembered for eventual swap-out
    expect(s.liberoReplacedPlayerId).toBe(14);
  });

  it('direct swap: swapping the active libero back out restores the true original player, not the other libero', async () => {
    await useMatchStore.getState().swapLibero(liberoA, 4);
    await useMatchStore.getState().swapLibero(liberoB); // direct swap, B now active
    await useMatchStore.getState().swapLibero(liberoB); // swap B out

    const s = useMatchStore.getState();
    expect(s.liberoOnCourt).toBe(false);
    expect(s.lineup[4].playerId).toBe(14); // original player, not liberoA
  });

  it('undo restores which libero was active before a direct swap', async () => {
    await useMatchStore.getState().swapLibero(liberoA, 4);
    await useMatchStore.getState().swapLibero(liberoB); // direct swap
    await useMatchStore.getState().undoLast();

    const s = useMatchStore.getState();
    expect(s.liberoId).toBe(99);  // back to A
    expect(s.libero2Id).toBe(98); // back to B
    expect(s.lineup[4].playerId).toBe(99);
  });
});

// ── swapLibero — front-row target queues until the back row ───────────────────

describe('swapLibero — front-row target queues until back row', () => {
  const liberoA = { id: 99, name: 'Lisa Libero', jersey_number: '0' };

  beforeEach(async () => {
    vi.clearAllMocks();
    await initMatch();
    loadLineup();
    useMatchStore.getState().setLibero(99, 'Lisa Libero', '0');
  });

  it('picking a front-row player does not touch the court or write a sub row', async () => {
    await useMatchStore.getState().swapLibero(liberoA, 1); // index 1 = position 2, front row

    const s = useMatchStore.getState();
    expect(s.liberoOnCourt).toBe(false);
    expect(s.lineup[1].playerId).toBe(11); // untouched
    expect(s.liberoReplacedPlayerId).toBe(11); // queued for this player
    expect(db.substitutions.add).not.toHaveBeenCalled();
  });

  it('the libero auto-swaps in the moment that player rotates into the back row', async () => {
    await useMatchStore.getState().swapLibero(liberoA, 1); // queue for the position-2 player (id 11)
    useMatchStore.getState().rotateForward(); // id 11 rotates from position 2 into position 1 (back row)

    const s = useMatchStore.getState();
    expect(s.liberoOnCourt).toBe(true);
    expect(s.liberoId).toBe(99);
    expect(s.lineup[0].playerId).toBe(99); // libero now occupying position 1
    expect(s.liberoReplacedPlayerId).toBe(11);
  });

  it('stays queued through a rotation that does not bring the target to the back row', async () => {
    await useMatchStore.getState().swapLibero(liberoA, 1); // queue for id 11 (position 2)
    useMatchStore.getState().rotateBackward(); // id 11 moves from position 2 to position 3 — still front row

    const s = useMatchStore.getState();
    expect(s.liberoOnCourt).toBe(false);
    expect(s.liberoReplacedPlayerId).toBe(11);
  });
});

describe('substitutePlayer — correction mode', () => {
  const benchPlayer = { id: 20, name: 'Bench Player', jersey_number: '9', position: 'OH' };

  beforeEach(async () => {
    vi.clearAllMocks();
    await initMatch();
    loadLineup();
  });

  it('normal sub is blocked once the set limit is reached', async () => {
    useMatchStore.setState({ subsUsed: useMatchStore.getState().maxSubsPerSet });
    const ok = await useMatchStore.getState().substitutePlayer(10, benchPlayer);
    expect(ok).toBe(false);
    expect(db.substitutions.add).not.toHaveBeenCalled();
  });

  it('correction sub is allowed even at the set limit', async () => {
    useMatchStore.setState({ subsUsed: useMatchStore.getState().maxSubsPerSet });
    const ok = await useMatchStore.getState().substitutePlayer(10, benchPlayer, undefined, {
      isCorrection: true,
    });
    expect(ok).toBe(true);
    expect(useMatchStore.getState().lineup[0].playerId).toBe(20);
  });

  it('correction sub does not increment subsUsed', async () => {
    const before = useMatchStore.getState().subsUsed;
    await useMatchStore.getState().substitutePlayer(10, benchPlayer, undefined, {
      isCorrection: true,
    });
    expect(useMatchStore.getState().subsUsed).toBe(before);
  });

  it('a normal sub still increments subsUsed as before', async () => {
    const before = useMatchStore.getState().subsUsed;
    await useMatchStore.getState().substitutePlayer(10, benchPlayer);
    expect(useMatchStore.getState().subsUsed).toBe(before + 1);
  });

  it('writes is_correction on the DB row', async () => {
    await useMatchStore.getState().substitutePlayer(10, benchPlayer, undefined, {
      isCorrection: true,
    });
    expect(db.substitutions.add).toHaveBeenCalledWith(
      expect.objectContaining({ is_correction: true })
    );
  });

  it('a normal sub writes is_correction: false', async () => {
    await useMatchStore.getState().substitutePlayer(10, benchPlayer);
    expect(db.substitutions.add).toHaveBeenCalledWith(
      expect.objectContaining({ is_correction: false })
    );
  });
});
