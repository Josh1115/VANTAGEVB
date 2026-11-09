import { describe, it, expect } from 'vitest';
import { recordsForYear, recordsForPlayer, countDoubles, rowYear } from '../seasonRecords';

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


describe('recordsForPlayer', () => {
  const defs = {
    match:  [{ key: 'k', label: 'Kills' }, { key: 'hit', label: 'HIT%' }],
    season: [{ key: 'k', label: 'Kills' }],
    career: [{ key: 'ace', label: 'Aces' }],
    team_match: [{ key: 'k', label: 'Kills' }],
  };
  const boards = {
    match:  { k: [{ rank: 1, name: 'Ava Lee', val: 25, year: '2026', opp: 'Fremd' }, { rank: 2, name: 'Mia', val: 20, year: '2026' }],
              hit: [{ rank: 1, name: 'Ava Lee', val: 0.5, year: '2026' }] },
    season: { k: [{ rank: 3, name: ' ava lee ', val: 300, year: '2025' }] },
    career: { ace: [{ rank: 1, name: 'Ava Lee', val: 90, career_year_end: '2026' }] },
    team_match: { k: [{ rank: 1, name: 'Ava Lee', val: 70, year: '2026' }] },
  };

  it('finds only this player, count stats, no team records; best rank first', () => {
    const r = recordsForPlayer(boards, 'Ava Lee', defs);
    expect(r.map(x => `${x.tab}:${x.label}:#${x.rank}`)).toEqual(['match:Kills:#1', 'career:Aces:#1', 'season:Kills:#3']);
    expect(r[0]).toMatchObject({ value: '25', year: '2026', opp: 'Fremd' });
    expect(r[1].year).toBe('2026');
  });

  it('returns [] without boards or name', () => {
    expect(recordsForPlayer(null, 'Ava', defs)).toEqual([]);
    expect(recordsForPlayer(boards, '', defs)).toEqual([]);
  });
});

describe('countDoubles', () => {
  it('counts 10+ in two / three categories per match', () => {
    const lines = [
      { stats: { k: 10, dig: 10, ast: 0 } },          // double
      { stats: { k: 12, dig: 15, ast: 11 } },         // triple (also a double)
      { stats: { k: 9.5, dig: 30 } },                 // one category only
      { stats: { blk: 10, ace: 10, k: 10, dig: 10 } },// 4 cats → triple + double
      { stats: {} },
    ];
    expect(countDoubles(lines)).toEqual({ singles: 4, doubles: 3, triples: 2 });
  });
  it('handles empty input', () => {
    expect(countDoubles(null)).toEqual({ singles: 0, doubles: 0, triples: 0 });
  });
});
