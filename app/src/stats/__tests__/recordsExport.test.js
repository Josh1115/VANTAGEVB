import { describe, it, expect, vi } from 'vitest';
vi.mock('jspdf', () => ({ default: class {} }));
vi.mock('jspdf-autotable', () => ({ default: () => {} }));
import { buildRecordsCsvRows } from '../export';

describe('buildRecordsCsvRows', () => {
  it('flattens leaderboards and tourneys', () => {
    const sections = [
      { label: 'Match', stats: [{ key: 'k', label: 'Kills', fmt: v => String(v) }],
        boards: { k: [{ rank: 1, name: 'Ava', val: 22, opp: 'Lakes', date: '2026-09-01', year: 2026, historical: false }] } },
      { label: 'Career', stats: [{ key: 'k', label: 'Kills', fmt: v => String(v) }],
        boards: { k: [{ rank: 1, name: 'Mia', val: 900, career_year_start: 2022, career_year_end: null, historical: true }] } },
    ];
    const rows = buildRecordsCsvRows(sections, [{ name: 'State', year: 2025, placing: 2, seed: 3 }]);
    expect(rows).toHaveLength(3);
    expect(rows[0]).toMatchObject({ Category: 'Match', Stat: 'Kills', Player: 'Ava', Value: '22', Opponent: 'Lakes', Source: 'App' });
    expect(rows[1]).toMatchObject({ Year: '2022–present', Source: 'Manually entered' });
    expect(rows[2]).toMatchObject({ Category: 'Tourney', Stat: 'State', Rank: 2, Value: 'Seed 3' });
  });
});
