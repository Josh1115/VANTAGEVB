import { describe, it, expect } from 'vitest';
import { gameSetScores, seasonPlayoffRounds } from '../seasonUtils';

const set = (n, us, opp, status = 'complete') => ({ set_number: n, our_score: us, opp_score: opp, status });
const game = (round, extra = {}) => ({
  status: 'complete', match_type: 'ihsa-playoffs', playoff_round: round,
  opponent_name: 'Palatine', our_sets_won: 3, opp_sets_won: 1, date: '2026-10-30', ...extra,
});

describe('gameSetScores', () => {
  it('lists finished sets in set order', () => {
    expect(gameSetScores([set(2, 22, 25), set(1, 25, 20), set(3, 25, 18)]))
      .toEqual([{ us: 25, opp: 20 }, { us: 22, opp: 25 }, { us: 25, opp: 18 }]);
  });
  it('leaves out a set that was never finished', () => {
    expect(gameSetScores([set(1, 25, 20), set(2, 3, 1, 'in_progress')])).toEqual([{ us: 25, opp: 20 }]);
  });
  it('is empty with no sets', () => {
    expect(gameSetScores(undefined)).toEqual([]);
  });
});

describe('playoff rounds use the tracked game set scores', () => {
  const scores = [{ us: 25, opp: 20 }, { us: 22, opp: 25 }, { us: 25, opp: 18 }, { us: 25, opp: 21 }];

  it('fills set scores on a round nobody typed', () => {
    const [row] = seasonPlayoffRounds([], [game('Sectional Final', { set_scores: scores })]);
    expect(row.set_scores).toEqual(scores);
    expect(row.score).toBe('3-1');
  });
  it('replaces typed set scores when the game was tracked', () => {
    const typed = [{ round: 'Sectional Final', opponent: 'Palatine', set_scores: [{ us: 25, opp: 10 }] }];
    const [row] = seasonPlayoffRounds(typed, [game('Sectional Final', { set_scores: scores })]);
    expect(row.set_scores).toEqual(scores);
  });
  it('keeps typed set scores when the game has none', () => {
    const typed = [{ round: 'Sectional Final', opponent: 'Palatine', set_scores: [{ us: 25, opp: 10 }] }];
    const [row] = seasonPlayoffRounds(typed, [game('Sectional Final')]);
    expect(row.set_scores).toEqual([{ us: 25, opp: 10 }]);
  });
  it('keeps typed set scores on a round with no tracked game', () => {
    const typed = [{ round: 'Regional Final', opponent: 'Barrington', set_scores: [{ us: 25, opp: 19 }] }];
    const rows = seasonPlayoffRounds(typed, []);
    expect(rows[0].set_scores).toEqual([{ us: 25, opp: 19 }]);
  });
});
