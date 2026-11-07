import { describe, it, expect } from 'vitest';
import { readSetScores, seasonPlayoffRounds } from '../seasonUtils';

describe('readSetScores', () => {
  it('turns typed scores into numbers, in order', () => {
    const typed = [{ us: '25', opp: '20' }, { us: '22', opp: '25' }, { us: '', opp: '' }];
    expect(readSetScores(typed)).toEqual({
      scores: [{ us: 25, opp: 20 }, { us: 22, opp: 25 }],
      incompleteSet: null,
    });
  });

  it('handles a round with no set scores', () => {
    expect(readSetScores(undefined)).toEqual({ scores: [], incompleteSet: null });
    expect(readSetScores([])).toEqual({ scores: [], incompleteSet: null });
  });

  it('reads scores that were already saved as numbers', () => {
    expect(readSetScores([{ us: 25, opp: 0 }]).scores).toEqual([{ us: 25, opp: 0 }]);
  });

  it('keeps a score of zero', () => {
    expect(readSetScores([{ us: '25', opp: '0' }])).toEqual({ scores: [{ us: 25, opp: 0 }], incompleteSet: null });
  });

  it('names the first set missing a score', () => {
    expect(readSetScores([{ us: '25', opp: '20' }, { us: '25', opp: '' }, { us: '', opp: '9' }]).incompleteSet).toBe(2);
  });
});

describe('seasonPlayoffRounds set scores', () => {
  const setScores = [{ us: 25, opp: 20 }, { us: 25, opp: 18 }];

  it('keeps set scores on a hand-entered round', () => {
    const [round] = seasonPlayoffRounds([{ round: 'Regional', opponent: 'Fremd', result: 'W', set_scores: setScores }], []);
    expect(round.set_scores).toEqual(setScores);
  });

  it('keeps set scores when a tracked game updates the round', () => {
    const game = { status: 'complete', match_type: 'ihsa-playoffs', playoff_round: 'Regional', opponent_name: 'Fremd', our_sets_won: 2, opp_sets_won: 0, date: '2026-10-20T12:00:00.000Z' };
    const [round] = seasonPlayoffRounds([{ round: 'Regional', opponent: 'Fremd', result: 'L', set_scores: setScores }], [game]);
    expect(round.result).toBe('W');
    expect(round.set_scores).toEqual(setScores);
  });
});
