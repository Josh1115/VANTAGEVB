import { describe, it, expect } from 'vitest';
import { buildCareerProjectedRow, SEASONS_LEFT_BY_GRADE } from '../projection';
import { fmtCount, fmtHitting } from '../formatters';

const cols = [
  { key: 'name', label: 'Name' },
  { key: 'mp', label: 'MP', fmt: fmtCount },
  { key: 'k', label: 'K', fmt: fmtCount },
  { key: 'hit_pct', label: 'HIT%', fmt: fmtHitting },
];

describe('buildCareerProjectedRow', () => {
  it('adds past totals to the season projection times seasons remaining', () => {
    // Sophomore: 50 past kills; this season on pace for 140 → 50 + 140 * 3 = 470
    const row = buildCareerProjectedRow({ mp: 20, k: 50 }, { mp: 35, k: 140, hit_pct: 0.25 }, cols, SEASONS_LEFT_BY_GRADE.Sophomore);
    expect(row.k).toBe(470);
    expect(row.mp).toBe(20 + 35 * 3);
    expect(row.hit_pct).toBe(0.25);
    expect(row.name).toBeUndefined();
  });
  it('senior with no past seasons equals the season projection', () => {
    const row = buildCareerProjectedRow(null, { mp: 35, k: 140 }, cols, SEASONS_LEFT_BY_GRADE.Senior);
    expect(row.k).toBe(140);
    expect(row.mp).toBe(35);
  });
  it('has no entry for unknown grades', () => {
    expect(SEASONS_LEFT_BY_GRADE['8th']).toBeUndefined();
  });
});
