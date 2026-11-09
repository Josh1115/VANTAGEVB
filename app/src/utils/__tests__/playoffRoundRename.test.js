import { describe, it, expect } from 'vitest';
import { prunedPlayoffRounds, seasonPlayoffRounds } from '../seasonUtils';

const game = (round, opponent, extra = {}) => ({
  status: 'complete', match_type: 'ihsa-playoffs', playoff_round: round, opponent_name: opponent,
  our_sets_won: 2, opp_sets_won: 0, date: '2026-10-28', ...extra,
});
const copy = (round, opponent) => ({ round, opponent, result: 'W', score: '2-0', opp_seed: '' });

describe('renamed playoff rounds', () => {
  it('shows one round when an old copy has the old round name', () => {
    const rows = seasonPlayoffRounds([copy('Regional Quarterfinal', 'Palatine')], [game('Regional Semifinal', 'Palatine')]);
    expect(rows.map(r => r.round)).toEqual(['Regional Semifinal']);
  });

  it('shows one round when both the old and new copies were saved', () => {
    const saved = [copy('Regional Quarterfinal', 'Palatine'), copy('Regional Semifinal', 'Palatine')];
    const rows = seasonPlayoffRounds(saved, [game('Regional Semifinal', 'Palatine')]);
    expect(rows.map(r => r.round)).toEqual(['Regional Semifinal']);
  });

  it('removes the leftover copy from the saved list', () => {
    const saved = [copy('Regional Quarterfinal', 'Palatine'), copy('Regional Semifinal', 'Palatine')];
    expect(prunedPlayoffRounds(saved, [game('Regional Semifinal', 'Palatine')]))
      .toEqual([copy('Regional Semifinal', 'Palatine')]);
  });

  it('changes nothing when there are no leftovers', () => {
    expect(prunedPlayoffRounds([copy('Regional Semifinal', 'Palatine')], [game('Regional Semifinal', 'Palatine')])).toBeNull();
    expect(prunedPlayoffRounds([], [])).toBeNull();
    expect(prunedPlayoffRounds(undefined, [game('Regional Semifinal', 'Palatine')])).toBeNull();
  });

  it('never removes hand-typed rounds without a tracked game', () => {
    const saved = [copy('Regional Quarterfinal', 'Barrington'), copy('Regional Semifinal', 'Palatine')];
    expect(prunedPlayoffRounds(saved, [game('Regional Semifinal', 'Palatine')])).toBeNull();
    const rows = seasonPlayoffRounds(saved, [game('Regional Semifinal', 'Palatine')]);
    expect(rows.map(r => r.opponent).sort()).toEqual(['Barrington', 'Palatine']);
  });

  it('keeps each game on its own round in a normal playoff run', () => {
    const saved = [copy('Regional Semifinal', 'Palatine'), copy('Regional Final', 'Fremd')];
    const games = [game('Regional Semifinal', 'Palatine', { date: '2026-10-28' }), game('Regional Final', 'Fremd', { date: '2026-10-30' })];
    expect(prunedPlayoffRounds(saved, games)).toBeNull();
    expect(seasonPlayoffRounds(saved, games).map(r => r.round)).toEqual(['Regional Final', 'Regional Semifinal']);
  });

  it('does not treat blank opponents as the same team', () => {
    const saved = [copy('Regional Quarterfinal', '')];
    expect(prunedPlayoffRounds(saved, [game('Regional Semifinal', '')])).toBeNull();
  });
});
