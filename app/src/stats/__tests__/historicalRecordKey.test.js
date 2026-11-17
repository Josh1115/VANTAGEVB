import { describe, it, expect } from 'vitest';
import { nkHistorical } from '../merge';

describe('nkHistorical (sync identity for typed-in records)', () => {
  const base = { category: 'team_season', stat: 'k', player_name: null, value: 900 };

  it('keeps team records for the same stat in different years apart', () => {
    expect(nkHistorical({ ...base, season_year: '2019' }))
      .not.toBe(nkHistorical({ ...base, season_year: '2022' }));
  });

  it('keeps one player\'s same-stat records from different matches apart', () => {
    const m = { category: 'match', stat: 'k', player_name: 'Sarah K' };
    expect(nkHistorical({ ...m, date: '2024-09-10', opponent: 'Lake Zurich' }))
      .not.toBe(nkHistorical({ ...m, date: '2025-09-12', opponent: 'Fremd' }));
  });

  it('still treats an edited value as the same record', () => {
    expect(nkHistorical({ ...base, season_year: '2019', value: 900 }))
      .toBe(nkHistorical({ ...base, season_year: '2019', value: 912 }));
  });
});
