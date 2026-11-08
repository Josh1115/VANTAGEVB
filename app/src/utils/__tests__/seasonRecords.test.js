import { describe, it, expect } from 'vitest';
import { recordsForYear, rowYear } from '../seasonRecords';

const defs = {
  match:       [{ key: 'k', label: 'Kills' }, { key: 'dig', label: 'Digs' }],
  season:      [{ key: 'k', label: 'Kills', fmt: v => `${v}!` }],
  team_match:  [{ key: 'ace', label: 'Aces' }],
  team_season: [{ key: 'ace', label: 'Aces' }],
  career:      [{ key: 'dig', label: 'Digs' }, { key: 'hit_pct', label: 'HIT%' }, { key: 'sp', label: 'Sets' }],
};

const boards = {
  match: {
    k:   [{ rank: 1, name: 'Sarah', val: 22, opp: 'Palatine', year: 2026 },
          { rank: 2, name: 'Old',   val: 20, opp: 'X', year: 2019 },
          { rank: 3, name: 'Hand',  val: 19, opp: 'Y', year: '', date: '2026-09-12' }],
    dig: [{ rank: 1, name: 'Emma', val: 31, opp: 'GN', year: '2026' }],
  },
  season:      { k: [{ rank: 4, name: 'Sarah', val: 388, year: 2026 }, { rank: 1, name: 'Old', val: 500, year: 2018 }] },
  team_match:  { ace: [{ rank: 6, val: 14, opp: 'Z', year: 2025 }] },
  team_season: { ace: [{ rank: 1, val: 312, year: 2026 }] },
  career:      { dig: [{ rank: 3, name: 'Kate', val: 845, career_year_end: 2026 },
                       { rank: 1, name: 'Active', val: 900, career_year_end: null }],
                 hit_pct: [{ rank: 1, name: 'Kate', val: 0.3, career_year_end: 2026 }],
                 sp:      [{ rank: 1, name: 'Kate', val: 400, career_year_end: 2026 }] },
};

describe('recordsForYear', () => {
  const groups = recordsForYear(boards, '2026', defs);

  it('keeps only groups with entries from that season', () => {
    expect(groups.map(g => g.tab)).toEqual(['match', 'season', 'team_season', 'career']);
  });

  it('sorts by rank, then stat order', () => {
    expect(groups[0].items.map(i => `${i.rank}${i.label}`)).toEqual(['1Kills', '1Digs', '3Kills']);
  });

  it('uses the date year for hand-entered match rows with no season', () => {
    expect(groups[0].items.some(i => i.name === 'Hand')).toBe(true);
  });

  it('formats values and drops names for team rows', () => {
    expect(groups[1].items[0].value).toBe('388!');
    expect(groups[2].items[0]).toMatchObject({ name: null, value: '312', rank: 1 });
  });

  it('counts career records only in the final season, never for active players', () => {
    expect(groups[3].items.map(i => i.name)).toEqual(['Kate']);
  });

  it('returns nothing for a season with no records or missing data', () => {
    expect(recordsForYear(boards, 2001, defs)).toEqual([]);
    expect(recordsForYear(null, 2026, defs)).toEqual([]);
  });
});

describe('stat filter', () => {
  it('leaves out rate stats and sets played', () => {
    const career = recordsForYear(boards, 2026, defs).find(g => g.tab === 'career');
    expect(career.items.map(i => i.label)).toEqual(['Digs']);
  });
});

describe('rowYear', () => {
  it('ignores a season-less row on season tabs', () => {
    expect(rowYear('season', { year: '' })).toBeNull();
  });
});
