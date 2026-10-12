import { describe, it, expect } from 'vitest';
import { buildBoardRows, buildRotationRows, buildSetRecap, totalErrors } from '../lineupBoard';

const sets = [
  { id: 11, set_number: 1 },
  { id: 12, set_number: 2 },
  { id: 13, set_number: 3 },
];
const c = (player_id, set_id, action, result, extra = {}) =>
  ({ player_id, set_id, match_id: 1, action, result, ...extra });

const contacts = [
  // Set 1 — player 1 hot server, player 2 errors
  c(1, 11, 'serve', 'ace'), c(1, 11, 'serve', 'in'), c(1, 11, 'serve', 'in'),
  c(2, 11, 'serve', 'error'), c(2, 11, 'attack', 'error'),
  // Set 2 — player 2 kills
  c(2, 12, 'attack', 'kill'), c(2, 12, 'attack', 'kill'), c(2, 12, 'attack', 'kill'),
  // Set 3 (in progress / future) — must never count when lining up set 3
  c(3, 13, 'attack', 'kill'),
  // Opponent contact — ignored
  c(9, 11, 'attack', 'kill', { opponent_contact: true }),
];

const row = (rows, id) => rows.find((r) => r.playerId === String(id));

describe('buildBoardRows', () => {
  it('whole match = only sets before the one being lined up', () => {
    const { rows } = buildBoardRows(contacts, sets, 3, 'match');
    expect(rows.map((r) => r.playerId).sort()).toEqual(['1', '2']);
    expect(row(rows, 2).k).toBe(3);
    expect(row(rows, 2).te).toBe(2);
    expect(row(rows, 1).si_pct).toBe(1);
  });

  it('last set = only the set right before', () => {
    const { rows } = buildBoardRows(contacts, sets, 3, 'last');
    expect(rows.map((r) => r.playerId)).toEqual(['2']);
    expect(row(rows, 2).te).toBe(0);
  });

  it('picks leaders, with a minimum-attempts rule for percentages', () => {
    const { leaders } = buildBoardRows(contacts, sets, 3, 'match');
    expect(leaders.k).toEqual(['2']);
    expect(leaders.ver_raw).toHaveLength(1);   // VER column present with a single leader
    expect(leaders.ace).toEqual(['1']);
    expect(leaders.si_pct).toEqual(['1']);   // 3/3 serves; player 2 only had 1 serve
    expect(leaders.te).toEqual(['2']);       // most errors → red
    expect(leaders.dig).toEqual([]);         // nobody has a dig → no leader
  });

  it('set 1 has no earlier sets → empty', () => {
    expect(buildBoardRows(contacts, sets, 1).rows).toEqual([]);
  });

  it('totalErrors adds every error bucket', () => {
    expect(totalErrors({ ae: 1, se: 1, be: 1, bhe: 1, fbe: 1, lift: 1, net: 1, dbl: 1, p0: 1 })).toBe(9);
  });
});

const ral = (set_id, our_rotation, serve_side, point_winner, server_player_id = null) =>
  ({ set_id, our_rotation, serve_side, point_winner, server_player_id });

const rallies = [
  // Rotation 1: we serve (player 7), win 3 of 4
  ral(11, 1, 'us', 'us', 7), ral(11, 1, 'us', 'us', 7), ral(12, 1, 'us', 'us', 7), ral(12, 1, 'us', 'them', 7),
  // Rotation 2: they serve, we win 1 of 4
  ral(11, 2, 'them', 'us'), ral(11, 2, 'them', 'them'), ral(12, 2, 'them', 'them'), ral(12, 2, 'them', 'them'),
  // Rotation 3: only 1 point → too few to be best/worst
  ral(11, 3, 'us', 'us', 4),
  // Set 3 — must not count
  ral(13, 2, 'them', 'us'), ral(13, 2, 'them', 'us'), ral(13, 2, 'them', 'us'),
];

describe('buildRotationRows', () => {
  it('scores each rotation from earlier sets only', () => {
    const { rows, best, worst } = buildRotationRows(rallies, sets, 3, 'match');
    const r1 = rows.find((r) => r.rot === 1);
    const r2 = rows.find((r) => r.rot === 2);
    expect([r1.won, r1.lost, r1.win_pct, r1.bp_pct, r1.so_pct]).toEqual([3, 1, 0.75, 0.75, null]);
    expect(r1.serverId).toBe('7');
    expect([r2.won, r2.lost, r2.so_pct]).toEqual([1, 3, 0.25]);
    expect(best).toBe(1);
    expect(worst).toBe(2);   // rotation 3 (1 point) ignored
  });

  it('last set only', () => {
    const { rows } = buildRotationRows(rallies, sets, 3, 'last');
    expect(rows.find((r) => r.rot === 1)).toMatchObject({ won: 1, lost: 1 });
    expect(rows.find((r) => r.rot === 2)).toMatchObject({ won: 0, lost: 2 });
  });

  it('no best/worst when fewer than 2 rotations qualify', () => {
    const { best, worst } = buildRotationRows(rallies.slice(0, 4), sets, 3);
    expect([best, worst]).toEqual([null, null]);
  });
});

describe('buildSetRecap', () => {
  // Set 2 (id 12): we lose 3–5. Sequence: U T T T T U U T
  const seq = ['us', 'them', 'them', 'them', 'them', 'us', 'us', 'them'];
  const serve = ['us', 'us', 'them', 'them', 'them', 'them', 'us', 'us'];
  const rots  = [1, 1, 2, 2, 2, 2, 3, 3];
  const rs = seq.map((w, i) => ({ set_id: 12, rally_number: i + 1, point_winner: w, serve_side: serve[i], our_rotation: rots[i], server_player_id: serve[i] === 'us' ? 7 : null }));
  rs.push({ set_id: 11, rally_number: 1, point_winner: 'us', serve_side: 'us', our_rotation: 1 }); // other set — ignored
  const k = (n, extra) => ({ set_id: 12, rally_number: n, player_id: 1, ...extra });
  const cs = [
    k(1, { action: 'serve', result: 'ace' }),                             // we earned
    k(2, { action: 'serve', result: 'error' }),                           // we gave
    k(3, { action: 'pass', result: '0' }),                                // aced → we gave
    k(4, { action: 'pass', result: '3', timestamp: 1 }), k(4, { action: 'attack', result: 'error', timestamp: 2 }), // we gave
    k(6, { action: 'pass', result: '2' }), k(6, { action: 'attack', result: 'kill' }),   // earned, side-out on good pass
    { set_id: 12, rally_number: 7, action: 'serve', result: 'error', opponent_contact: true }, // they gave
  ];
  const set = { id: 12, set_number: 2, our_score: 3, opp_score: 5 };
  const r = buildSetRecap(cs, rs, set);

  it('score line', () => {
    expect(r.score).toEqual({ us: 3, them: 5, won: false, firstServe: 'us', ourLead: 1, oppLead: 3 });
  });
  it('point sources', () => {
    expect(r.points).toEqual({ weEarned: 2, theyGave: 1, ourOther: 0, theyEarned: 2, weGave: 3 });
  });
  it('runs', () => {
    expect(r.runs.them).toMatchObject({ len: 4, fromUs: 1, fromThem: 0, rotation: 2 });
    expect(r.runs.us).toMatchObject({ len: 2, fromUs: 1, fromThem: 4, server: '7' });
  });
  it('serve / pass battle', () => {
    expect(r.battle).toMatchObject({ ourSE: 1, theirSE: 1, ourAces: 1, theirAces: 1 });
    expect(r.battle.passAvg).toBeCloseTo(5 / 3);
    expect(r.battle.byPass.perfect).toEqual({ n: 1, pct: 0 });
    expect(r.battle.byPass.good).toEqual({ n: 1, pct: 1 });
    expect(r.battle.byPass.bad).toEqual({ n: 0, pct: null });   // the 0-pass (ace) is not counted
  });
  it('no set → null', () => {
    expect(buildSetRecap(cs, rs, null)).toBeNull();
  });
});
