/**
 * Tests for addOppPoint — verifies that each OppScoringColumn button
 * correctly awards a point to the right team and writes the right contact.
 *
 * BHE and NET should award a point to the HOME team (ourScore++).
 * K and BLK should award a point to the OPPONENT (oppScore++).
 * SE and AE should award a point to the HOME team (ourScore++).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks (hoisted automatically by Vitest) ──────────────────────────────────

vi.mock('../../db/schema', () => ({
  db: {
    contacts: { add: vi.fn().mockResolvedValue(42) },
    rallies:  { add: vi.fn().mockResolvedValue(99) },
  },
}));

vi.mock('../../store/uiStore', () => ({
  useUiStore: {
    getState: () => ({ showToast: vi.fn() }),
  },
}));

vi.mock('../../utils/storage', () => ({
  getIntStorage: vi.fn().mockReturnValue(NaN),
  STORAGE_KEYS: { MAX_SUBS: 'vbstat_max_subs' },
}));

// ── Subject under test ───────────────────────────────────────────────────────
import { useMatchStore } from '../matchStore';
import { db } from '../../db/schema';

// ── Helpers ──────────────────────────────────────────────────────────────────

async function initMatch() {
  useMatchStore.getState().resetMatch();
  useMatchStore.getState().setMatch(1, 1, 1, 'best_of_3', 15);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('addOppPoint — point side', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initMatch();
  });

  it('BHE: increments ourScore (home gets point)', async () => {
    await useMatchStore.getState().addOppPoint('BHE');
    expect(useMatchStore.getState().ourScore).toBe(1);
    expect(useMatchStore.getState().oppScore).toBe(0);
  });

  it('NET: increments ourScore (home gets point)', async () => {
    await useMatchStore.getState().addOppPoint('NET');
    expect(useMatchStore.getState().ourScore).toBe(1);
    expect(useMatchStore.getState().oppScore).toBe(0);
  });

  it('SE: increments ourScore (home gets point)', async () => {
    await useMatchStore.getState().addOppPoint('SE');
    expect(useMatchStore.getState().ourScore).toBe(1);
    expect(useMatchStore.getState().oppScore).toBe(0);
  });

  it('AE: increments ourScore (home gets point)', async () => {
    await useMatchStore.getState().addOppPoint('AE');
    expect(useMatchStore.getState().ourScore).toBe(1);
    expect(useMatchStore.getState().oppScore).toBe(0);
  });

  it('K: increments oppScore (opponent gets point)', async () => {
    await useMatchStore.getState().addOppPoint('K');
    expect(useMatchStore.getState().ourScore).toBe(0);
    expect(useMatchStore.getState().oppScore).toBe(1);
  });

  it('BLK: increments oppScore (opponent gets point)', async () => {
    await useMatchStore.getState().addOppPoint('BLK');
    expect(useMatchStore.getState().ourScore).toBe(0);
    expect(useMatchStore.getState().oppScore).toBe(1);
  });
});

describe('addOppPoint — contact data written to DB', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initMatch();
  });

  it('BHE writes contact with action=error, result=ball_handling_error', async () => {
    await useMatchStore.getState().addOppPoint('BHE');
    expect(db.contacts.add).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'error',
        result: 'ball_handling_error',
        opponent_contact: true,
        player_id: null,
      })
    );
  });

  it('NET writes contact with action=error, result=net', async () => {
    await useMatchStore.getState().addOppPoint('NET');
    expect(db.contacts.add).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'error',
        result: 'net',
        opponent_contact: true,
        player_id: null,
      })
    );
  });

  it('SE writes contact with action=serve, result=error', async () => {
    await useMatchStore.getState().addOppPoint('SE');
    expect(db.contacts.add).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'serve',
        result: 'error',
        opponent_contact: true,
        player_id: null,
      })
    );
  });

  it('K writes contact with action=attack, result=kill', async () => {
    await useMatchStore.getState().addOppPoint('K');
    expect(db.contacts.add).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'attack',
        result: 'kill',
        opponent_contact: true,
        player_id: null,
      })
    );
  });
});

describe('addOppPoint — feed label', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await initMatch();
  });

  it('BHE sets feed label "+1 Opp BHE"', async () => {
    await useMatchStore.getState().addOppPoint('BHE');
    expect(useMatchStore.getState().lastFeedItem?.label).toBe('+1 Opp BHE');
  });

  it('NET sets feed label "+1 Opp Net"', async () => {
    await useMatchStore.getState().addOppPoint('NET');
    expect(useMatchStore.getState().lastFeedItem?.label).toBe('+1 Opp Net');
  });

  it('K sets feed label "Opp Kill"', async () => {
    await useMatchStore.getState().addOppPoint('K');
    expect(useMatchStore.getState().lastFeedItem?.label).toBe('Opp Kill');
  });
});
