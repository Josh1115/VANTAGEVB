import { describe, it, expect } from 'vitest';
import { buildProjectedRow, isCountingCol, PROJECTION_MIN_MATCHES } from '../projection';
import { fmtCount, fmtPct, fmtHitting, fmtBlocks, fmtRate, fmtVER, fmtPassRating } from '../formatters';

describe('isCountingCol', () => {
  it('treats integer-count columns as scalable', () => {
    expect(isCountingCol({ fmt: fmtCount })).toBe(true);
    expect(isCountingCol({ fmt: fmtBlocks })).toBe(true);
  });
  it('treats rates / percentages / ratings as NOT scalable', () => {
    for (const fmt of [fmtPct, fmtHitting, fmtRate, fmtVER, fmtPassRating, undefined]) {
      expect(isCountingCol({ fmt })).toBe(false);
    }
  });
});

describe('buildProjectedRow', () => {
  const cols = [
    { key: 'mp', label: 'MP', fmt: fmtCount },
    { key: 'sp', label: 'SP', fmt: fmtCount },
    { key: 'k',  label: 'K',  fmt: fmtCount },
    { key: 'hit_pct', label: 'HIT%', fmt: fmtHitting },
    { key: 'ver', label: 'VER', fmt: fmtVER },
  ];
  const playerRow = { mp: 8, sp: 30, k: 96, hit_pct: 0.312, ver: 2.4 };

  it('scales counting stats by the factor and rounds', () => {
    // 35 / 10 team matches played = 3.5x
    const row = buildProjectedRow(playerRow, cols, 35 / 10, 35);
    expect(row.k).toBe(Math.round(96 * 3.5)); // 336
    expect(row.sp).toBe(Math.round(30 * 3.5)); // 105
  });

  it('pins mp to the projected match count, not a scaled value', () => {
    const row = buildProjectedRow(playerRow, cols, 35 / 10, 35);
    expect(row.mp).toBe(35);
  });

  it('carries rates / ratings through unchanged', () => {
    const row = buildProjectedRow(playerRow, cols, 35 / 10, 35);
    expect(row.hit_pct).toBe(0.312);
    expect(row.ver).toBe(2.4);
  });

  it('skips the name column and tags the row id', () => {
    const row = buildProjectedRow(playerRow, [{ key: 'name' }, ...cols], 1, 35);
    expect('name' in row).toBe(false);
    expect(row.id).toBe('__projected__');
  });

  it('leaves non-numeric / missing counting values alone', () => {
    const row = buildProjectedRow({ k: null }, [{ key: 'k', fmt: fmtCount }], 3.5, 35);
    expect(row.k).toBe(null);
  });

  it('exports a sane minimum-matches guard', () => {
    expect(PROJECTION_MIN_MATCHES).toBeGreaterThanOrEqual(1);
  });
});
