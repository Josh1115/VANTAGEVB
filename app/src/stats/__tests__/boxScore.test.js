import { describe, it, expect } from 'vitest';
import { buildBoxScoreRows, boxScoreFilename } from '../export';

const roster = [
  { id: 1, name: 'Ana Reed',  jersey_number: 5  },
  { id: 2, name: 'Bea Cole',  jersey_number: 12 },
  { id: 3, name: 'Cy Newman', jersey_number: 3  }, // did not record a stat
];

const playerStats = {
  1: { sa: 10, ace: 2, se: 1, apr: 2.4, ta: 20, k: 10, ae: 3, k_pct: 0.5, hit_pct: 0.35, bs: 1, ba: 2, dig: 5,  ast: 1  },
  2: { sa: 8,  ace: 1, se: 0, apr: 2.1, ta: 0,  k: 0,  ae: 0, k_pct: null, hit_pct: null, bs: 0, ba: 1, dig: 12, ast: 30 },
};

// True team totals from the engine (not a re-sum of the two rows above —
// pretend an archived player also contributed).
const teamStats = { sa: 20, ace: 3, se: 1, apr: 2.25, ta: 22, k: 11, ae: 3, k_pct: 0.5, hit_pct: 0.3636, bs: 1, ba: 3, dig: 17, ast: 31 };

describe('buildBoxScoreRows', () => {
  it('emits one row per roster player, in the order given', () => {
    const { players } = buildBoxScoreRows(roster, playerStats, teamStats);
    expect(players.map((p) => p.name)).toEqual(['#5 Ana Reed', '#12 Bea Cole', '#3 Cy Newman']);
  });

  it('uses the fixed requested column order', () => {
    const { columns } = buildBoxScoreRows(roster, playerStats, teamStats);
    expect(columns.map((c) => c.label)).toEqual(
      ['SA', 'ACE', 'SE', 'APR', 'ATT', 'K', 'AE', 'K%', 'HIT%', 'BLK', 'DIG', 'AST'],
    );
  });

  it('counts stats straight through and totals blocks as solo + assist', () => {
    const { players } = buildBoxScoreRows(roster, playerStats, teamStats);
    // Ana: SA ACE SE APR ATT K AE K% HIT% BLK DIG AST
    expect(players[0].cells).toEqual(
      ['10', '2', '1', '2.40', '20', '10', '3', '50.0%', '+0.350', '3', '5', '1'],
    );
    expect(players[1].cells[9]).toBe('1'); // Bea blocks: 0 + 1
  });

  it('renders "—" for a no-stat player and for null rate cells', () => {
    const { players } = buildBoxScoreRows(roster, playerStats, teamStats);
    expect(players[2].cells.every((c) => c === '-')).toBe(true); // Cy never played
    expect(players[1].cells[7]).toBe('-'); // Bea K%  (0 attempts)
    expect(players[1].cells[8]).toBe('-'); // Bea HIT%
  });

  it('team row is the engine totals, not a re-sum of shown players', () => {
    const { team } = buildBoxScoreRows(roster, playerStats, teamStats);
    expect(team.name).toBe('TEAM');
    expect(team.cells[0]).toBe('20');      // SA  (18 across shown rows; 20 is real total)
    expect(team.cells[3]).toBe('2.25');    // APR
    expect(team.cells[7]).toBe('50.0%');   // K%
    expect(team.cells[8]).toBe('+0.364');  // HIT%
    expect(team.cells[9]).toBe('4');       // BLK 1 + 3
  });

  it('handles a player with a missing jersey number', () => {
    const { players } = buildBoxScoreRows(
      [{ id: 1, name: 'Ana Reed', jersey_number: '' }], playerStats, teamStats,
    );
    expect(players[0].name).toBe('Ana Reed');
  });
});

describe('boxScoreFilename', () => {
  it('builds a descriptive name from opponent + date', () => {
    expect(boxScoreFilename({ opponent_name: 'Madison West', date: '2026-08-25T12:00:00.000Z' }))
      .toBe('vantage-vs-madison-west-2026-08-25-boxscore.pdf');
  });

  it('falls back cleanly with no data', () => {
    expect(boxScoreFilename({})).toBe('vantage-vs-opponent-undated-boxscore.pdf');
  });
});
