import { describe, it, expect, vi, beforeEach } from 'vitest';

// Tiny in-memory stand-in for the two tables the seed helpers touch.
const store = vi.hoisted(() => ({ seasons: [], history: [], nextId: 100 }));
vi.mock('../../db/schema', () => ({
  db: {
    seasons: { get: async id => store.seasons.find(s => s.id === id) },
    season_history: {
      where: () => ({ equals: teamId => ({ filter: fn => ({
        first: async () => store.history.filter(h => h.team_id === teamId).find(fn),
      }) }) }),
      update: async (id, fields) => Object.assign(store.history.find(h => h.id === id), fields),
      add: async row => { store.history.push({ id: store.nextId++, ...row }); },
    },
  },
}));

import { seedDigits, getOurSeed, saveOurSeed } from '../seasonUtils';

beforeEach(() => {
  store.seasons = [{ id: 1, team_id: 7, year: 2026 }];
  store.history = [];
});

describe('seedDigits', () => {
  it('reads the number out of a typed seed', () => {
    expect(seedDigits('#2')).toBe('2');
    expect(seedDigits('02')).toBe('2');
    expect(seedDigits(3)).toBe('3');
    expect(seedDigits('')).toBe('');
    expect(seedDigits(null)).toBe('');
  });
});

describe('our playoff seed', () => {
  it('creates the season History entry when there is none yet', async () => {
    await saveOurSeed(1, '2');
    expect(store.history).toEqual([{ id: 100, team_id: 7, year: 2026, playoff_seed: '2' }]);
    expect(await getOurSeed(1)).toBe('2');
  });

  it('updates the existing entry and keeps everything else on it', async () => {
    store.history = [{ id: 5, team_id: 7, year: '2026', playoff_seed: '#4', head_coach: 'Smith' }];
    expect(await getOurSeed(1)).toBe('4');
    await saveOurSeed(1, '3');
    expect(store.history).toEqual([{ id: 5, team_id: 7, year: '2026', playoff_seed: '3', head_coach: 'Smith' }]);
  });

  it('never erases a saved seed when the box is left blank', async () => {
    store.history = [{ id: 5, team_id: 7, year: 2026, playoff_seed: '2' }];
    await saveOurSeed(1, '');
    await saveOurSeed(1, '   ');
    expect(store.history[0].playoff_seed).toBe('2');
  });

  it('only touches this season, not another year or team', async () => {
    store.history = [
      { id: 5, team_id: 7, year: 2025, playoff_seed: '6' },
      { id: 6, team_id: 8, year: 2026, playoff_seed: '1' },
    ];
    await saveOurSeed(1, '2');
    expect(store.history.map(h => h.playoff_seed)).toEqual(['6', '1', '2']);
  });

  it('does nothing for an unknown season', async () => {
    await saveOurSeed(999, '2');
    expect(store.history).toEqual([]);
    expect(await getOurSeed(999)).toBe('');
  });
});
