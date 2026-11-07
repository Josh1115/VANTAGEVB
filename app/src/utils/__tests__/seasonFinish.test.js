import { describe, it, expect } from 'vitest';
import { allTimeRank, inferSeasonFinish, resolveSeasonFinish, seasonPlayoffRounds } from '../seasonUtils';

describe('allTimeRank', () => {
  const board = [
    { val: 500, year: 2019, historical: true, player_id: 7 },
    { val: 417, year: 2026, player_id: 1 },
    { val: 417, year: 2024, player_id: 2 },
    { val: 300, year: 2025, player_id: 3 },
  ];
  const season = (year, id) => (r) => r.year === year && r.player_id === id;

  it('gives the place on the list, including hand-entered seasons', () => {
    expect(allTimeRank(board, season(2025, 3))).toBe(4);
  });
  it('gives #1 when nothing beats it', () => {
    expect(allTimeRank([{ val: 417, year: 2026, player_id: 1 }], season(2026, 1))).toBe(1);
  });
  it('lets tied seasons share a place', () => {
    expect(allTimeRank(board, season(2026, 1))).toBe(2);
    expect(allTimeRank(board, season(2024, 2))).toBe(2);
  });
  it('is empty when the season is not in the top 10 list', () => {
    expect(allTimeRank(board, season(2026, 99))).toBeNull();
    expect(allTimeRank(undefined, season(2026, 1))).toBeNull();
  });
  it('does not match a hand-entered row as the tracked season', () => {
    expect(allTimeRank(board, season(2019, 7))).toBeNull();
  });
});

const game = (round, us, them, date = '2026-10-20', extra = {}) => ({
  status: 'complete', match_type: 'ihsa-playoffs', playoff_round: round,
  our_sets_won: us, opp_sets_won: them, date, ...extra,
});

describe('inferSeasonFinish', () => {
  it('labels the last round played as Won or Loss', () => {
    expect(inferSeasonFinish([], [game('Regional', 2, 0), game('Sectional', 0, 2)])).toBe('Loss Sectional');
    expect(inferSeasonFinish([], [game('Regional', 2, 0), game('Sectional', 2, 1)])).toBe('Won Sectional');
  });

  it('won the sectional semifinal, lost the final (the reported 2026 season)', () => {
    const games = [game('Sectional Final', 0, 2, '2026-10-30'), game('Sectional Semifinal', 2, 0, '2026-10-28')];
    expect(inferSeasonFinish([], games)).toBe('Loss Sectional Final');
  });

  it('goes by date, however the rounds are named', () => {
    const games = [game('Semi Final', 2, 0, '2026-10-28'), game('Sectional Final', 0, 2, '2026-10-30')];
    expect(inferSeasonFinish([], games)).toBe('Loss Sectional Final');
  });

  it('goes by start time for two games on the same day', () => {
    const games = [
      game('Semi Final', 2, 0, '2026-10-28', { match_time: '10:00' }),
      game('Sectional Final', 0, 2, '2026-10-28', { match_time: '14:00' }),
    ];
    expect(inferSeasonFinish([], games)).toBe('Loss Sectional Final');
  });

  it('falls back to round name for same-day games with no start time', () => {
    const games = [game('Regional Final', 2, 0), game('Regional Semifinal', 2, 0)];
    expect(inferSeasonFinish([], games)).toBe('Won Regional Final');
  });

  it('ranks every spelling of Super-Sectional above Sectional', () => {
    for (const name of ['Super-Sectional', 'Super Sectional', 'Supersectional', 'Super-Sectional Final']) {
      expect(inferSeasonFinish([], [game(name, 0, 2), game('Sectional Final', 2, 0)])).toBe(`Loss ${name}`);
    }
  });

  it('reads "Section" as "Sectional" for rounds entered by hand', () => {
    const rounds = [{ round: 'Section Final', result: 'L' }, { round: 'Section Semi Final', result: 'W' }];
    expect(inferSeasonFinish(rounds, [])).toBe('Loss Section Final');
  });

  it('ignores unfinished and non-playoff games', () => {
    const games = [
      game('Regional', 2, 0),
      game('Sectional', 0, 0, '2026-10-22', { status: 'scheduled' }),
      game('Sectional', 2, 0, '2026-10-22', { match_type: 'regular' }),
    ];
    expect(inferSeasonFinish([], games)).toBe('Won Regional');
  });

  it('counts a typed round for a game that was never tracked', () => {
    const rounds = [{ round: 'Sectional', result: 'L' }];
    expect(inferSeasonFinish(rounds, [game('Regional', 2, 0)])).toBe('Loss Sectional');
  });

  it('shows just the round name when a typed round has no result', () => {
    expect(inferSeasonFinish([{ round: 'Sectional Final', result: '' }], [])).toBe('Sectional Final');
  });

  it('trusts the tracked game over a typed row for the same round', () => {
    const rounds = [{ round: 'regional', result: 'L' }];
    expect(inferSeasonFinish(rounds, [game('Regional', 2, 0)])).toBe('Won Regional');
  });

  it('is blank with no playoff data', () => expect(inferSeasonFinish([], [])).toBe(''));
});

describe('seasonPlayoffRounds', () => {
  const names = (rows) => rows.map(r => r.round);

  it('puts the final round on top and the first round on the bottom', () => {
    const games = [
      game('Regional Semifinal', 2, 0, '2026-10-20'),
      game('Sectional Final', 0, 2, '2026-10-30'),
      game('Regional Final', 2, 1, '2026-10-22'),
      game('Sectional Semifinal', 2, 0, '2026-10-28'),
    ];
    expect(names(seasonPlayoffRounds([], games)))
      .toEqual(['Sectional Final', 'Sectional Semifinal', 'Regional Final', 'Regional Semifinal']);
  });

  it('orders hand-entered rounds by name, whatever order they were entered in', () => {
    const rows = ['Sectional', 'State Championship', 'First Round', 'Regional', 'Second Round', 'Super-Sectional']
      .map(round => ({ round, result: 'W' }));
    expect(names(seasonPlayoffRounds(rows, [])))
      .toEqual(['State Championship', 'Super-Sectional', 'Sectional', 'Regional', 'Second Round', 'First Round']);
  });

  it('puts 3rd place above the state semifinal and below the state final', () => {
    const rows = ['3rd Place', 'State Semifinal', 'State Championship'].map(round => ({ round, result: 'W' }));
    expect(names(seasonPlayoffRounds(rows, []))).toEqual(['State Championship', '3rd Place', 'State Semifinal']);
  });

  it('puts unknown names on top, with the last one entered highest', () => {
    const rows = ['Regional', 'Round 3', 'Round 4'].map(round => ({ round, result: 'W' }));
    expect(names(seasonPlayoffRounds(rows, []))).toEqual(['Round 4', 'Round 3', 'Regional']);
  });

  it('adds a completed game missing from the saved list, with its details', () => {
    const saved = [{ round: 'Regional', opponent: 'A', result: 'W', score: '2-0', opp_seed: '' }];
    const final = game('Sectional', 1, 2, '2026-10-30', { opponent_name: 'B', opponent_playoff_seed: 3 });
    const [top, bottom] = seasonPlayoffRounds(saved, [final]);
    expect(top).toMatchObject({ round: 'Sectional', opponent: 'B', result: 'L', score: '1-2', opp_seed: '3' });
    expect(bottom.round).toBe('Regional');
  });

  it('does not list a game twice when it is already saved', () => {
    const saved = [{ round: 'regional', opponent: 'a', result: 'L', score: '', opp_seed: '2' }];
    const rows = seasonPlayoffRounds(saved, [game('Regional', 2, 0, '2026-10-20', { opponent_name: 'A' })]);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ round: 'Regional', opponent: 'A', result: 'W', score: '2-0', opp_seed: '2' });
  });

  it('keeps two games in the same round with different opponents separate', () => {
    const saved = [{ round: 'Regional', opponent: 'B', result: 'W' }];
    const games = [
      game('Regional', 2, 0, '2026-10-20', { opponent_name: 'A' }),
      game('Regional', 0, 2, '2026-10-22', { opponent_name: 'B' }),
    ];
    const rows = seasonPlayoffRounds(saved, games);
    expect(rows.map(r => [r.opponent, r.result])).toEqual([['B', 'L'], ['A', 'W']]);
  });

  it('skips unfinished games and leaves the saved list untouched', () => {
    const saved = [{ round: 'Regional', result: 'W' }];
    const copy = JSON.parse(JSON.stringify(saved));
    expect(seasonPlayoffRounds(saved, [game('Sectional', 0, 0, '2026-10-30', { status: 'scheduled' })])).toEqual(saved);
    seasonPlayoffRounds(saved, [game('Regional', 0, 2)]);
    expect(saved).toEqual(copy);
  });

  it('sorts a row with no round name to the bottom and ignores it for Finish', () => {
    const rows = [{ opponent: 'A', result: 'W' }, { round: 'Regional', result: 'L' }];
    expect(seasonPlayoffRounds(rows, [])[1].opponent).toBe('A');
    expect(inferSeasonFinish(rows, [])).toBe('Loss Regional');
    expect(inferSeasonFinish([{ opponent: 'A', result: 'W' }], [])).toBe('');
  });

  it('capitalizes only the first letter of each word in round names', () => {
    const cases = {
      'SECTIONAL SEMIFINAL': 'Sectional Semifinal',
      'regional final': 'Regional Final',
      'SUPER-SECTIONAL': 'Super-Sectional',
      '3RD PLACE': '3rd Place',
      'ihsa state championship': 'IHSA State Championship',
    };
    for (const [saved, shown] of Object.entries(cases)) {
      expect(seasonPlayoffRounds([{ round: saved, result: 'W' }], [])[0].round).toBe(shown);
      expect(seasonPlayoffRounds([], [game(saved, 2, 0)])[0].round).toBe(shown);
    }
  });

  it('uses the corrected capitals in Finish too', () => {
    expect(inferSeasonFinish([], [game('SECTIONAL SEMIFINAL', 0, 2)])).toBe('Loss Sectional Semifinal');
    expect(resolveSeasonFinish('SECTIONAL', [], [])).toBe('Loss Sectional');
  });

  it('agrees with Finish on the last round', () => {
    const games = [game('Sectional Final', 0, 2, '2026-10-30'), game('Sectional Semifinal', 2, 0, '2026-10-28')];
    expect(seasonPlayoffRounds([], games)[0].round).toBe('Sectional Final');
    expect(inferSeasonFinish([], games)).toBe('Loss Sectional Final');
  });
});

describe('resolveSeasonFinish', () => {
  const games = [game('Regional', 2, 0, '2026-10-20'), game('Sectional', 0, 2, '2026-10-25')];

  it('replaces a stuck auto-filled finish', () => {
    expect(resolveSeasonFinish('Won Regional', [], games)).toBe('Loss Sectional');
    expect(resolveSeasonFinish('Regional', [], games)).toBe('Loss Sectional');
    expect(resolveSeasonFinish('Sectional', [], games)).toBe('Loss Sectional');
  });

  it('replaces old "Won" text even if it matches no current round', () => {
    expect(resolveSeasonFinish('Won Section Semi Final', [], games)).toBe('Loss Sectional');
  });

  it('keeps custom wording', () => {
    expect(resolveSeasonFinish('State Runner-Up', [], games)).toBe('State Runner-Up');
  });

  it('fills in a blank finish', () => expect(resolveSeasonFinish(null, [], games)).toBe('Loss Sectional'));

  it('keeps a saved finish that already has a result when there is nothing else to go on', () => {
    expect(resolveSeasonFinish('Won State Title', [], [])).toBe('Won State Title');
    expect(resolveSeasonFinish('Loss Sectional', [], [])).toBe('Loss Sectional');
  });

  it('reads a bare round name with no games or rounds as a loss', () => {
    for (const name of ['Sectional', 'Sectionals', 'Regional Final', 'Section Semi Final', 'Super-Sectional', 'Semifinal', 'State Semifinal']) {
      expect(resolveSeasonFinish(name, [], [])).toBe(`Loss ${name}`);
    }
  });

  it('does not assume a loss for State or State Final, since those teams may have finished 1st or 3rd', () => {
    for (const name of ['State', 'States', 'State Final', 'State Finals', 'IHSA State Final']) {
      expect(resolveSeasonFinish(name, [], [])).toBe(name);
    }
    expect(resolveSeasonFinish(null, [{ round: 'State Final', result: '' }], [])).toBe('State Final');
  });

  it('still lets real games update a saved State or State Final', () => {
    const lost = [game('State Final', 1, 2)];
    expect(resolveSeasonFinish('State', [], lost)).toBe('Loss State Final');
    expect(resolveSeasonFinish('State Final', [], [game('State Final', 2, 1)])).toBe('State Champions');
  });

  it('reads a typed round with no result picked as a loss', () => {
    expect(resolveSeasonFinish(null, [{ round: 'Sectional Final', result: '' }], [])).toBe('Loss Sectional Final');
  });

  it('does not mark champions or custom wording as a loss', () => {
    for (const name of ['State Championship', 'Regional Champions', 'State Runner-Up', 'Round 1', 'Final']) {
      expect(resolveSeasonFinish(name, [], [])).toBe(name);
    }
  });

  it('lets real games override a saved bare round name not in the round list', () => {
    expect(resolveSeasonFinish('Sectional Semi', [], games)).toBe('Sectional Semi');
    expect(resolveSeasonFinish('Sectional Semi Final', [], games)).toBe('Loss Sectional');
  });

  it('is blank when there is nothing to show', () => expect(resolveSeasonFinish(null, [], [])).toBe(''));

  describe('state final', () => {
    const final = (us, them, name = 'State Championship') => [
      game('State Semifinal', 2, 0, '2026-11-06'), game(name, us, them, '2026-11-07'),
    ];

    it('shows State Champions for a win, however the final is named', () => {
      for (const name of ['State Championship', 'State Final', 'State Finals', 'IHSA State Championship']) {
        expect(resolveSeasonFinish(null, [], final(2, 1, name))).toBe('State Champions');
      }
    });

    it('works for a hand-entered round', () => {
      expect(resolveSeasonFinish(null, [{ round: 'State Championship', result: 'W' }], [])).toBe('State Champions');
    });

    it('still shows a loss for losing the final', () => {
      expect(resolveSeasonFinish(null, [], final(1, 2))).toBe('Loss State Championship');
    });

    it('does not call a state semifinal win or 3rd place win champions', () => {
      expect(resolveSeasonFinish(null, [], [game('State Semifinal', 2, 0)])).toBe('Won State Semifinal');
      expect(resolveSeasonFinish(null, [], [game('State 3rd Place', 2, 0)])).toBe('Won State 3rd Place');
    });

    it('replaces an old "Won State Championship" and updates if the result is corrected', () => {
      expect(resolveSeasonFinish('Won State Championship', [], final(2, 1))).toBe('State Champions');
      expect(resolveSeasonFinish('State Champions', [], final(1, 2))).toBe('Loss State Championship');
    });

    it('keeps a saved State Champions when there are no games or rounds', () => {
      expect(resolveSeasonFinish('State Champions', [], [])).toBe('State Champions');
    });
  });
});
