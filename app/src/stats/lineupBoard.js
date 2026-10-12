import { computePlayerStats, computePointQuality } from './engine';

// Minimum attempts before a player can "lead" a percentage/average column —
// stops a 1-for-1 server from showing as the 100% leader.
export const MIN_ATTEMPTS = 3;

export const BOARD_COLUMNS = [
  { key: 'ver_raw', label: 'VER',  title: 'VER (unweighted)', kind: 'good' },
  { key: 'k',       label: 'K',    title: 'Kills',          kind: 'good' },
  { key: 'hit_pct', label: 'Hit%', title: 'Hitting %',      kind: 'good', min: 'ta' },
  { key: 'si_pct',  label: 'Srv%', title: 'Serve % (in)',   kind: 'good', min: 'sa' },
  { key: 'ace',     label: 'Ace',  title: 'Aces',           kind: 'good' },
  { key: 'se',      label: 'SE',   title: 'Serve Errors',   kind: 'bad' },
  { key: 'apr',     label: 'Pass', title: 'Pass Average',   kind: 'good', min: 'pa' },
  { key: 'dig',     label: 'Dig',  title: 'Digs',           kind: 'good' },
  { key: 'blk',     label: 'Blk',  title: 'Blocks',         kind: 'good' },
  { key: 'te',      label: 'Errs', title: 'Total Errors',   kind: 'bad' },
];

// Same error buckets VER penalizes, plus aced-on-pass (P0).
export function totalErrors(s) {
  return (s.ae ?? 0) + (s.se ?? 0) + (s.be ?? 0) + (s.bhe ?? 0) + (s.fbe ?? 0)
       + (s.lift ?? 0) + (s.net ?? 0) + (s.dbl ?? 0) + (s.p0 ?? 0);
}

/**
 * Rows for the between-sets stat board.
 * Only counts sets that come BEFORE `setNumber` (the set being lined up).
 * scope: 'match' = all earlier sets, 'last' = only the set right before.
 * Returns { rows: [{ playerId, ...stats, te }], leaders: { [colKey]: playerId[] } }
 */
export function buildBoardRows(contacts, sets, setNumber, scope = 'match') {
  const setNumById = new Map(sets.map((s) => [s.id, s.set_number]));
  const keep = (num) => num != null && (scope === 'last' ? num === setNumber - 1 : num < setNumber);
  const scoped = contacts.filter((c) => keep(setNumById.get(c.set_id)));

  const stats = computePlayerStats(scoped);
  const rows = Object.entries(stats).map(([playerId, s]) => ({ playerId, ...s, te: totalErrors(s) }));

  const leaders = {};
  for (const col of BOARD_COLUMNS) {
    const eligible = rows.filter((r) => r[col.key] != null && (!col.min || (r[col.min] ?? 0) >= MIN_ATTEMPTS));
    if (!eligible.length) { leaders[col.key] = []; continue; }
    const best = Math.max(...eligible.map((r) => r[col.key]));
    // Counting stats need to be above zero to "lead" (0 kills isn't leading anything).
    if (best <= 0 && !col.min) { leaders[col.key] = []; continue; }
    leaders[col.key] = eligible.filter((r) => r[col.key] === best).map((r) => r.playerId);
  }
  return { rows, leaders };
}

/**
 * Per-rotation effectiveness for the between-sets board.
 * Same set filtering as buildBoardRows. Rallies need our_rotation (1-6).
 * Returns { rows: [{ rot, won, lost, total, win_pct, so_pct, bp_pct, serverId }], best, worst }
 * best/worst = rotation numbers (needs MIN_ATTEMPTS points played to qualify).
 */
export function buildRotationRows(rallies, sets, setNumber, scope = 'match') {
  const setNumById = new Map(sets.map((s) => [s.id, s.set_number]));
  const keep = (num) => num != null && (scope === 'last' ? num === setNumber - 1 : num < setNumber);

  const acc = {};
  for (let r = 1; r <= 6; r++) acc[r] = { so_opp: 0, so_win: 0, bp_opp: 0, bp_win: 0, servers: {} };
  for (const r of rallies) {
    if (!keep(setNumById.get(r.set_id))) continue;
    const a = acc[r.our_rotation];
    if (!a) continue;
    const won = r.point_winner === 'us';
    if (r.serve_side === 'them') { a.so_opp++; if (won) a.so_win++; }
    else {
      a.bp_opp++; if (won) a.bp_win++;
      if (r.server_player_id) a.servers[r.server_player_id] = (a.servers[r.server_player_id] ?? 0) + 1;
    }
  }

  const ratio = (n, d) => (d > 0 ? n / d : null);
  const rows = Object.entries(acc).map(([rot, a]) => {
    const total = a.so_opp + a.bp_opp;
    const won   = a.so_win + a.bp_win;
    const top   = Object.entries(a.servers).sort((x, y) => y[1] - x[1])[0];
    return {
      rot: Number(rot), won, lost: total - won, total,
      win_pct: ratio(won, total),
      so_pct:  ratio(a.so_win, a.so_opp),
      bp_pct:  ratio(a.bp_win, a.bp_opp),
      serverId: top ? String(top[0]) : null,
    };
  });

  const eligible = rows.filter((r) => r.total >= MIN_ATTEMPTS);
  let best = null, worst = null;
  if (eligible.length >= 2) {
    const hi = Math.max(...eligible.map((r) => r.win_pct));
    const lo = Math.min(...eligible.map((r) => r.win_pct));
    if (hi !== lo) {
      best  = eligible.find((r) => r.win_pct === hi).rot;
      worst = eligible.find((r) => r.win_pct === lo).rot;
    }
  }
  return { rows, best, worst };
}

const mode = (arr) => {
  const n = {};
  for (const v of arr) if (v != null) n[v] = (n[v] ?? 0) + 1;
  const top = Object.entries(n).sort((a, b) => b[1] - a[1])[0];
  return top ? top[0] : null;
};

/**
 * Recap of ONE finished set (the one right before the set being lined up).
 * contacts/rallies may contain the whole match — they're filtered to `set.id`.
 * Point sources follow computePointQuality (getting aced = an error we "handed" them).
 */
export function buildSetRecap(contacts, rallies, set) {
  if (!set) return null;
  const rs = rallies.filter((r) => r.set_id === set.id).sort((a, b) => a.rally_number - b.rally_number);
  const cs = contacts.filter((c) => c.set_id === set.id);
  if (!rs.length && !cs.length) return null;

  // ── Score line ──
  const rallyUs   = rs.filter((r) => r.point_winner === 'us').length;
  const us   = set.our_score ?? rallyUs;
  const them = set.opp_score ?? (rs.length - rallyUs);
  let u = 0, t = 0, ourLead = 0, oppLead = 0;
  for (const r of rs) {
    if (r.point_winner === 'us') u++; else t++;
    ourLead = Math.max(ourLead, u - t);
    oppLead = Math.max(oppLead, t - u);
  }
  const firstServe = rs[0]?.serve_side ?? null;

  // ── Where points came from ──
  const pq = computePointQuality(cs);
  const weEarned   = Math.round(pq.earned.total);
  const theyGave   = pq.free.total;
  const weGave     = pq.given.total;
  const theyEarned = Math.max(0, them - weGave);
  const ourOther   = Math.max(0, us - weEarned - theyGave);

  // ── Longest runs ──
  const runs = { us: null, them: null };
  let start = 0; u = 0; t = 0;
  for (let i = 0; i < rs.length; i++) {
    const side = rs[i].point_winner === 'us' ? 'us' : 'them';
    const prevSide = i > 0 ? (rs[i - 1].point_winner === 'us' ? 'us' : 'them') : null;
    if (side !== prevSide) start = i;
    const len = i - start + 1;
    if (!runs[side] || len > runs[side].len) {
      const slice = rs.slice(start, i + 1);
      runs[side] = {
        len,
        fromUs: u - (side === 'us' ? len - 1 : 0), fromThem: t - (side === 'them' ? len - 1 : 0),
        server:   side === 'us' ? mode(slice.filter((r) => r.serve_side === 'us').map((r) => r.server_player_id)) : null,
        rotation: side === 'them' ? Number(mode(slice.map((r) => r.our_rotation))) || null : null,
      };
    }
    if (side === 'us') u++; else t++;
  }

  // ── Serve / pass battle ──
  const ourPasses = cs.filter((c) => !c.opponent_contact && c.action === 'pass' && ['0', '1', '2', '3'].includes(String(c.result)));
  const passAvg = ourPasses.length ? ourPasses.reduce((a, c) => a + Number(c.result), 0) / ourPasses.length : null;

  const winnerByRally = new Map(rs.map((r) => [r.rally_number, r]));
  const firstPassByRally = new Map();
  for (const c of [...ourPasses].sort((a, b) => (a.timestamp ?? a.id ?? 0) - (b.timestamp ?? b.id ?? 0))) {
    if (!firstPassByRally.has(c.rally_number)) firstPassByRally.set(c.rally_number, String(c.result));
  }
  const byPass = { perfect: { n: 0, won: 0 }, good: { n: 0, won: 0 }, bad: { n: 0, won: 0 } };
  for (const [num, rating] of firstPassByRally) {
    const r = winnerByRally.get(num);
    if (!r || r.serve_side !== 'them') continue;
    // A 0 pass is an ace — no chance to side out, so it isn't a "Win% on" bucket.
    const b = rating === '3' ? byPass.perfect : rating === '2' ? byPass.good : rating === '1' ? byPass.bad : null;
    if (!b) continue;
    b.n++; if (r.point_winner === 'us') b.won++;
  }

  return {
    score: { us, them, won: us > them, firstServe, ourLead, oppLead },
    points: { weEarned, theyGave, ourOther, theyEarned, weGave },
    runs,
    battle: {
      ourSE: pq.given.se, theirSE: pq.free.se,
      ourAces: pq.earned.ace, theirAces: pq.given.p0,
      passAvg,
      byPass: Object.fromEntries(Object.entries(byPass).map(([k, v]) => [k, { n: v.n, pct: v.n ? v.won / v.n : null }])),
    },
  };
}
