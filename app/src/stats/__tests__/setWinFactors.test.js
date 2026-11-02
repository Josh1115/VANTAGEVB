import { describe, it, expect, vi } from 'vitest';

// Two matches: match 1 won 2-1, match 2 lost 1-2 → 3 sets won, 3 sets lost.
const SETS = [
  { id: 11, match_id: 1, status: 'complete', winner: 'us',   our_score: 25, opp_score: 23 },
  { id: 12, match_id: 1, status: 'complete', winner: 'them', our_score: 18, opp_score: 25 },
  { id: 13, match_id: 1, status: 'complete', winner: 'us',   our_score: 15, opp_score: 10 },
  { id: 21, match_id: 2, status: 'complete', winner: 'them', our_score: 20, opp_score: 25 },
  { id: 22, match_id: 2, status: 'complete', winner: 'us',   our_score: 25, opp_score: 12 },
  { id: 23, match_id: 2, status: 'complete', our_score: 13, opp_score: 15 }, // no winner stored → use score
  { id: 24, match_id: 2, status: 'in_progress', our_score: 3, opp_score: 1 },
];

// One kill in every set we won, one attack error in every set we lost.
const CONTACTS = SETS.filter(s => s.status === 'complete').map((s, i) => {
  const won = s.winner === 'us';
  return { id: i + 1, match_id: s.match_id, set_id: s.id, rally_number: 1, player_id: 7,
    action: 'attack', result: won ? 'kill' : 'error' };
});

vi.mock('../queries', () => ({
  getMatchesForSeason:             async () => [
    { id: 1, status: 'complete', our_sets_won: 2, opp_sets_won: 1 },
    { id: 2, status: 'complete', our_sets_won: 1, opp_sets_won: 2 },
  ],
  getSetsForMatches:               async () => SETS,
  getContactsForMatches:           async () => CONTACTS,
  getRalliesForMatchesWithMatchId: async () => [],
  getPlayerPositionsForMatches:    async () => ({}),
  getBatchSetsPlayedCount:         async () => ({ 1: 3, 2: 3 }),
}));

const { setCloseness, splitSetsByResult, computeWinCorrelation } = await import('../engine');

describe('set-level win factors', () => {
  it('weights close sets more than blowouts', () => {
    expect(setCloseness(26, 24)).toBe(1.5);
    expect(setCloseness(25, 20)).toBe(1.0);
    expect(setCloseness(25, 12)).toBe(0.6);
  });

  it('splits completed sets by winner, falling back to the score', () => {
    const { won, lost } = splitSetsByResult(SETS, [1, 2]);
    expect(won.map(s => s.id)).toEqual([11, 13, 22]);
    expect(lost.map(s => s.id)).toEqual([12, 21, 23]);
  });

  it('only counts sets from the filtered matches', () => {
    const { won, lost } = splitSetsByResult(SETS, [1]);
    expect(won.length).toBe(2);
    expect(lost.length).toBe(1);
  });

  it('set mode counts sets, match mode returns null with only 1W/1L', async () => {
    expect(await computeWinCorrelation(1)).toBeNull();
    const res = await computeWinCorrelation(1, {}, { unit: 'set' });
    expect(res.win.matches).toBe(3);
    expect(res.loss.matches).toBe(3);
    expect(res.win.team.kps).toBe(1);
    expect(res.loss.team.kps).toBe(0);
    expect(res.win.players[7].matchesPlayed).toBe(3);
  });
});
