import { describe, it, expect } from 'vitest';
import { currentStreak, seasonOpener } from '../seasonSummary';

const m = (date, us, them, extra = {}) => ({ date, our_sets_won: us, opp_sets_won: them, status: 'complete', ...extra });

describe('currentStreak', () => {
  it('is null before any match', () => expect(currentStreak([])).toBeNull());
  it('counts consecutive wins from the newest match, regardless of input order', () => {
    expect(currentStreak([m('2026-09-01', 2, 0), m('2026-09-10', 2, 1), m('2026-09-05', 0, 2), m('2026-09-12', 2, 0)]))
      .toEqual({ win: true, count: 2 });
  });
  it('reports a losing streak', () => {
    expect(currentStreak([m('2026-09-01', 2, 0), m('2026-09-03', 1, 2), m('2026-09-04', 0, 2)])).toEqual({ win: false, count: 2 });
  });
});

describe('seasonOpener', () => {
  it('picks the earliest unplayed dated match', () => {
    const all = [
      { id: 1, date: '2026-09-10', status: 'scheduled' },
      { id: 2, date: '2026-09-03', status: 'scheduled' },
      { id: 3, date: null, status: 'scheduled' },
      { id: 4, date: '2026-09-01', status: 'complete' },
    ];
    expect(seasonOpener(all, 'complete').id).toBe(2);
  });
  it('is null with nothing scheduled', () => expect(seasonOpener([], 'complete')).toBeNull());
});
