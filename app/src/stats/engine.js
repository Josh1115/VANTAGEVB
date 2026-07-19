import {
  getContactsForMatch, getRalliesForMatch, getSetsPlayedCount,
  getContactsForMatches, getMatchesForSeason, getRalliesForMatches,
  getPlayerPositionsForMatches, getBatchSetsPlayedCount, getOppScoredForMatches,
  getOurScoredForMatches, getTimeoutsForMatches,
} from './queries';
import { POSITION_MULTIPLIERS, MATCH_STATUS } from '../constants';

// ── Internal helpers ────────────────────────────────────────────────────────

const div = (n, d) => (d > 0 ? n / d : null);

// Uniform divisor applied to the whole VER formula so the final numbers are
// smaller and easier to read. Every weight and tier threshold shares this same
// factor, so no ratio between stats changes — this is purely a display scale.
export const VER_SCALE = 4;

function mkAccum() {
  return {
    // serve — totals
    sa: 0, ace: 0, se: 0, se_ob: 0, se_net: 0, se_foot: 0,
    // serve — by type
    f_sa: 0, f_ace: 0, f_se: 0,   // float
    t_sa: 0, t_ace: 0, t_se: 0,   // topspin
    // pass — result stored as '0' | '1' | '2' | '3'
    pa: 0, p0: 0, p1: 0, p2: 0, p3: 0,
    // pass — by receive type
    f_pa: 0, f_p0: 0, f_p1: 0, f_p2: 0, f_p3: 0,
    t_pa: 0, t_p0: 0, t_p1: 0, t_p2: 0, t_p3: 0,
    // attack
    ta: 0, k: 0, ae: 0, ae_ob: 0, ae_net: 0, ae_blk: 0, ae_bra: 0,
    k_pure: 0, k_tool: 0, k_over: 0, k_tip: 0, k_bk: 0, k_touch: 0,
    // set
    ast: 0, bhe: 0,
    // error actions (L/DBL/NET tap on PlayerTile)
    lift: 0, dbl: 0, net: 0,
    // block
    bs: 0, ba: 0, be: 0,
    // dig
    dig: 0, fb_dig: 0, de: 0,
    // freeball
    fbr: 0, fbs: 0, fbe: 0,
  };
}

// count > 1 is used by synthetic box-score contacts to represent aggregate totals
function accumContact(p, { action, result, serve_type, receive_type, error_type, kill_type, count = 1 }) {
  const n = count;
  if (action === 'serve') {
    p.sa += n;
    if (result === 'ace')   p.ace += n;
    if (result === 'error') {
      p.se += n;
      if (error_type === 'ob')   p.se_ob   += n;
      if (error_type === 'net')  p.se_net  += n;
      if (error_type === 'foot') p.se_foot += n;
    }
    if (serve_type === 'float') {
      p.f_sa += n;
      if (result === 'ace')   p.f_ace += n;
      if (result === 'error') p.f_se  += n;
    } else if (serve_type === 'topspin') {
      p.t_sa += n;
      if (result === 'ace')   p.t_ace += n;
      if (result === 'error') p.t_se  += n;
    }
  } else if (action === 'pass') {
    p.pa += n;
    if      (result === '0') p.p0 += n;
    else if (result === '1') p.p1 += n;
    else if (result === '2') p.p2 += n;
    else if (result === '3') p.p3 += n;
    if (receive_type === 'float') {
      p.f_pa += n;
      if      (result === '0') p.f_p0 += n;
      else if (result === '1') p.f_p1 += n;
      else if (result === '2') p.f_p2 += n;
      else if (result === '3') p.f_p3 += n;
    } else if (receive_type === 'topspin') {
      p.t_pa += n;
      if      (result === '0') p.t_p0 += n;
      else if (result === '1') p.t_p1 += n;
      else if (result === '2') p.t_p2 += n;
      else if (result === '3') p.t_p3 += n;
    }
  } else if (action === 'attack') {
    p.ta += n;
    if (result === 'kill') {
      p.k += n;
      if (kill_type === 'pure') p.k_pure += n;
      if (kill_type === 'tool') p.k_tool += n;
      if (kill_type === 'over') p.k_over += n;
      if (kill_type === 'tip')   p.k_tip   += n;
      if (kill_type === 'bk')    p.k_bk    += n;
      if (kill_type === 'touch') p.k_touch += n;
    }
    if (result === 'error') {
      p.ae += n;
      if (error_type === 'ob')  p.ae_ob  += n;
      if (error_type === 'net') p.ae_net += n;
      if (error_type === 'blk') p.ae_blk += n;
      if (error_type === 'bra') p.ae_bra += n;
    }
  } else if (action === 'set') {
    if (result === 'assist')              p.ast += n;
    if (result === 'ball_handling_error') p.bhe += n;
  } else if (action === 'block') {
    if (result === 'solo')   p.bs += n;
    if (result === 'assist') p.ba += n;
    if (result === 'error')  p.be += n;
  } else if (action === 'dig') {
    if (result === 'success')  p.dig    += n;
    if (result === 'freeball') p.fb_dig += n;
    if (result === 'error')    p.de     += n;
  } else if (action === 'freeball_receive') {
    if (result === 'free_ball_error') p.fbe += n;
    else                              p.fbr += n;
  } else if (action === 'freeball_send') {
    p.fbs += n;
  } else if (action === 'error') {
    if (result === 'lift')   p.lift += n;
    if (result === 'double') p.dbl  += n;
    if (result === 'net')    p.net  += n;
  }
}

// Derive all display-ready stat values from an accumulator + sets played
function deriveStats(p, sp, posLabel = null) {
  const posMult = POSITION_MULTIPLIERS[posLabel] ?? 1.0;
  const hitPct  = div(p.k - p.ae, p.ta);
  // Raw VER — every weight below, before the position multiplier is applied.
  // Not position-comparable on its own (a Libero's raw ceiling is far lower than an
  // OH's, since they draw from far fewer stat categories) — that's what posMult exists
  // to correct for. Exposed separately as ver_raw so the Stats page can show both.
  const verRaw = sp > 0
    ? (
        (1 / sp) * (
          4.0  * p.k    +
          4.0  * p.ace  +
          5.0  * p.bs   +
          2.5  * p.ba   +
          1.0  * p.ast  +
          2.0  * (p.dig + p.fb_dig) +
          (p.p1 + p.p2 * 2 + p.p3 * 3 - p.pa * 2) -
          3.0  * p.ae   -
          3.0  * p.se   -
          3.0  * p.be   -
          3.0  * p.bhe  -
          3.0  * p.fbe  -
          3.0  * p.lift -
          3.0  * p.net  -
          3.0  * p.dbl
        ) +
        13.3 * (hitPct ?? 0)
      ) / VER_SCALE
    : null;
  return {
    // Serving — totals
    sa: p.sa, ace: p.ace, se: p.se, se_ob: p.se_ob, se_net: p.se_net, se_foot: p.se_foot,
    ace_pct:  div(p.ace,    p.sa),
    se_pct:   div(p.se,     p.sa),
    si_pct:   div(p.sa - p.se, p.sa),   // 1st-serve-in %
    sob_pct:  div(p.se_ob,  p.sa),      // OB errors as % of serves attempted
    snet_pct: div(p.se_net, p.sa),      // NET errors as % of serves attempted
    // Serving — float
    f_sa: p.f_sa, f_ace: p.f_ace, f_se: p.f_se,
    f_ace_pct: div(p.f_ace, p.f_sa),
    f_se_pct:  div(p.f_se,  p.f_sa),
    f_si_pct:  div(p.f_sa - p.f_se, p.f_sa),
    // Serving — topspin
    t_sa: p.t_sa, t_ace: p.t_ace, t_se: p.t_se,
    t_ace_pct: div(p.t_ace, p.t_sa),
    t_se_pct:  div(p.t_se,  p.t_sa),
    t_si_pct:  div(p.t_sa - p.t_se, p.t_sa),

    // Passing
    pa: p.pa, p0: p.p0, p1: p.p1, p2: p.p2, p3: p.p3,
    apr:    div(p.p1 + p.p2 * 2 + p.p3 * 3, p.pa),
    pp_pct: div(p.p3, p.pa),
    f_pa: p.f_pa, f_p0: p.f_p0, f_p1: p.f_p1, f_p2: p.f_p2, f_p3: p.f_p3,
    f_apr: div(p.f_p1 + p.f_p2 * 2 + p.f_p3 * 3, p.f_pa),
    t_pa: p.t_pa, t_p0: p.t_p0, t_p1: p.t_p1, t_p2: p.t_p2, t_p3: p.t_p3,
    t_apr: div(p.t_p1 + p.t_p2 * 2 + p.t_p3 * 3, p.t_pa),

    // Attacking
    ta: p.ta, k: p.k,
    k_pure: p.k_pure, k_pure_pct: div(p.k_pure, p.k),
    k_tool: p.k_tool, k_tool_pct: div(p.k_tool, p.k),
    k_over: p.k_over, k_over_pct: div(p.k_over, p.k),
    k_tip:   p.k_tip,   k_tip_pct:   div(p.k_tip,   p.k),
    k_bk:    p.k_bk,    k_bk_pct:    div(p.k_bk,    p.k),
    k_touch: p.k_touch, k_touch_pct: div(p.k_touch, p.k),
    ae: p.ae, ae_ob: p.ae_ob, ae_net: p.ae_net, ae_blk: p.ae_blk, ae_bra: p.ae_bra,
    ae_ob_pct:  div(p.ae_ob,  p.ae),
    ae_net_pct: div(p.ae_net, p.ae),
    ae_blk_pct: div(p.ae_blk, p.ae),
    ae_bra_pct: div(p.ae_bra, p.ae),
    hit_pct: hitPct,
    k_pct:   div(p.k,  p.ta),
    kps:     div(p.k,  sp),
    aeps:    div(p.ae, sp),

    // Setting / penalty errors
    ast: p.ast, bhe: p.bhe, lift: p.lift, dbl: p.dbl, net: p.net,
    set_att: p.ast + p.bhe,
    aps: div(p.ast, sp),

    // Blocking
    bs: p.bs, ba: p.ba, be: p.be,
    blk: p.bs + p.ba * 0.5,
    bps: div(p.bs + p.ba * 0.5, sp),

    // Defense
    dig: p.dig, fb_dig: p.fb_dig, de: p.de,
    dips: div(p.dig, sp),
    recs: div(p.pa,  sp),

    // Freeball
    fbr: p.fbr, fbs: p.fbs, fbe: p.fbe,

    // Volleyball Efficiency Rating (position-adjusted)
    // VER = posMult × verRaw — see verRaw above for the full weighted formula.
    // APR component (P1+2P2+3P3−2PA): +1 per perfect pass, 0 at APR=2 (neutral), −2 per ace-against.
    // Naturally zero when PA=0 (no pass attempts), so no special-casing needed.
    // HIT% term sits outside the (1/sp) division — it's already a rate, not a count, so
    // dividing it by sets played again would wrongly shrink it for players with more playing
    // time. Multiplier of 13.3 makes a realistic hit% swing (.100 to .400) worth about one
    // kill's worth of VER (4.0); it's null-guarded to 0 when a player has no attack attempts.
    // VER_SCALE divides the whole thing down so the numbers stay easy to read at a glance —
    // ratios between every stat are untouched, kills/aces just read as a clean 1.0 baseline
    // instead of 4.0. VERBadge's tier thresholds are scaled by the same factor.
    //
    // ver_raw is exposed for the Stats page's "VER" column (position-unweighted, NOT
    // comparable across positions); ver is the position-weighted value used everywhere
    // else in the app (tier badges, sorting, hero displays) and shown as "wVER" there.
    ver_raw: verRaw,
    ver: sp > 0 ? posMult * verRaw : null,
    pos_label: posLabel ?? null,
    pos_mult:  posMult,
  };
}

// ── Pure computation functions ──────────────────────────────────────────────

/**
 * Per-player stats from any contacts array.
 * Returns { [playerId]: statRow }
 */
export function computePlayerStats(contacts, setsPlayed = 1, playerPositions = {}) {
  const accums      = {};
  const playerSets  = {}; // { [playerId]: Set<setId> }
  const playerMatches = {}; // { [playerId]: Set<matchId> }

  for (const c of contacts) {
    if (!c.player_id || c.opponent_contact) continue;
    const id = c.player_id;
    (accums[id] ??= mkAccum());
    accumContact(accums[id], c);
    (playerSets[id]    ??= new Set()).add(c.set_id);
    (playerMatches[id] ??= new Set()).add(c.match_id);
  }

  return Object.fromEntries(
    Object.entries(accums).map(([id, acc]) => {
      const row = deriveStats(acc, playerSets[id]?.size ?? setsPlayed, playerPositions[id] ?? null);
      row.sp = playerSets[id]?.size    ?? 0;
      row.mp = playerMatches[id]?.size ?? 0;
      return [id, row];
    })
  );
}

/**
 * Team-aggregate stats from any contacts array.
 * Returns a single statRow summing all players.
 */
export function computeTeamStats(contacts, setsPlayed = 1) {
  const acc = mkAccum();
  for (const c of contacts) {
    if (c.opponent_contact) continue;
    accumContact(acc, c);
  }
  return deriveStats(acc, setsPlayed);
}

/**
 * Opponent display stats for the live run strip.
 * ACE  = our '0' passes (opponent served an ace).
 * SE   = SE button taps (opponent serve errors).
 * K    = K button taps (opponent kills).
 * AE   = AE button taps (opponent attack errors).
 * BLK  = BLK button taps (opponent blocks).
 * ERRS = BHE + NET button taps combined (opponent unforced errors).
 */
export function computeOppDisplayStats(contacts) {
  let ace = 0, se = 0, k = 0, ae = 0, blk = 0, errs = 0;
  for (const c of contacts) {
    if (!c.opponent_contact) {
      // ACE: our own pass logged as '0' (opponent served an unreturnable)
      if (c.action === 'pass' && c.result === '0') ace++;
      continue;
    }
    // opponent_contact === true
    if      (c.action === 'serve'  && c.result === 'error') se++;
    else if (c.action === 'attack' && c.result === 'kill')  k++;
    else if (c.action === 'attack' && c.result === 'error') ae++;
    else if (c.action === 'block'  && c.result === 'solo')  blk++;
    else if (c.action === 'error')                          errs++; // BHE + NET
  }
  return { ace, se, k, ae, blk, errs };
}

/**
 * Per-player points earned while serving (SRV PT).
 * Counts rallies where we were serving and won the point, keyed by server_player_id.
 * Returns { [playerId]: count }
 */
export function computeServingPoints(rallies) {
  const pts = {};
  for (const r of rallies) {
    if (r.serve_side === 'us' && r.point_winner === 'us' && r.server_player_id) {
      const pid = r.server_player_id;
      pts[pid] = (pts[pid] ?? 0) + 1;
    }
  }
  return pts;
}

/**
 * Rotation & sideout stats from a rallies array.
 * Returns { so_pct, bp_pct, rotations: { 1..6: { so_pct, bp_pct, ... } } }
 */
export function computeRotationStats(rallies) {
  let so_opp = 0, so_win = 0, bp_opp = 0, bp_win = 0;
  const rots = Object.fromEntries(
    Array.from({ length: 6 }, (_, i) => [i + 1, { so_opp: 0, so_win: 0, bp_opp: 0, bp_win: 0 }])
  );

  for (const { serve_side, point_winner, our_rotation } of rallies) {
    const usWon = point_winner === 'us';
    const rot   = rots[our_rotation];
    if (serve_side === 'them') {
      so_opp++; if (usWon) so_win++;
      if (rot) { rot.so_opp++; if (usWon) rot.so_win++; }
    } else {
      bp_opp++; if (usWon) bp_win++;
      if (rot) { rot.bp_opp++; if (usWon) rot.bp_win++; }
    }
  }

  return {
    so_pct: div(so_win, so_opp),
    bp_pct: div(bp_win, bp_opp),
    rotations: Object.fromEntries(
      Object.entries(rots).map(([n, r]) => [n, {
        so_pct: div(r.so_win, r.so_opp),
        bp_pct: div(r.bp_win, r.bp_opp),
        so_opp: r.so_opp, so_win: r.so_win,
        bp_opp: r.bp_opp, bp_win: r.bp_win,
      }])
    ),
  };
}

/**
 * Per-rotation contact stats (K, ACE, SE, AE, PA, P0-P3, APR, HIT%, etc.)
 * Requires contacts to have been stamped with rotation_num at record time.
 * Returns { 1: statRow, 2: statRow, ... 6: statRow }
 */
export function computeRotationContactStats(contacts) {
  const accums = {};
  for (let r = 1; r <= 6; r++) accums[r] = mkAccum();
  for (const c of contacts) {
    if (c.opponent_contact || !c.rotation_num) continue;
    const a = accums[c.rotation_num];
    if (a) accumContact(a, c);
  }
  return Object.fromEntries(
    Object.entries(accums).map(([r, acc]) => [r, deriveStats(acc, 1)])
  );
}

/**
 * One player's passing (APR) split out by the rotation they were in when they passed it.
 * Returns { rot1_apr, rot2_apr, ..., rot6_apr } — null for a rotation with no receptions.
 */
export function computePlayerRotationPassing(contacts, playerId) {
  const playerContacts = contacts.filter((c) => c.player_id === playerId);
  const byRotation = computeRotationContactStats(playerContacts);
  const row = {};
  for (let r = 1; r <= 6; r++) row[`rot${r}_apr`] = byRotation[r]?.apr ?? null;
  return row;
}

/**
 * In-System vs Out-of-System first-ball offense stats.
 *
 * IS  = serve-receive pass rated 3 → track the first attack outcome after that pass
 * OOS = pass rated 1 or 2 → same
 * Rating 0 (ace against us) is excluded.
 *
 * "First offensive contact" after the pass (by timestamp):
 *   action='attack'                             → TA (K if kill, AE if error)
 *   action='set', result='ball_handling_error'  → TA + AE (BHE / lift)
 * If the ball returns to our side and there are more attacks, they are NOT counted.
 *
 * Stats per IS/OOS slot: ta, k, ae, win, k_pct, hit_pct, win_pct
 *
 * Returns { byRotation: { 1..6: { is: {...}, oos: {...} } }, total: same }
 */

// Build a rally lookup Map keyed by "set_id_rally_number".
// Shared by computeISvsOOS, computeTransitionAttack, computeFreeDigWin, computeFreeballOutcomes
// so the Map is only built once per stats computation rather than 4 separate times.
function buildRallyMap(rallies) {
  return new Map(rallies.map((r) => [`${r.set_id}_${r.rally_number}`, r]));
}

// Group our (non-opponent) contacts by rally key. Pass sorted=true to sort
// each bucket by timestamp ascending (needed for sequence-dependent functions).
function groupContactsByRally(contacts, sorted = false) {
  const map = new Map();
  for (const c of contacts) {
    if (c.opponent_contact) continue;
    const key = `${c.set_id}_${c.rally_number}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(c);
  }
  if (sorted) {
    for (const arr of map.values()) arr.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
  }
  return map;
}

export function computeISvsOOS(contacts, rallies, rallyMap = buildRallyMap(rallies)) {
  const mkSlot = () => ({ ta: 0, k: 0, ae: 0, win: 0 });
  const byRotation = {};
  for (let r = 1; r <= 6; r++) byRotation[r] = { is: mkSlot(), oos: mkSlot() };
  const total = { is: mkSlot(), oos: mkSlot() };

  const contactsByRally = groupContactsByRally(contacts);

  for (const [key, rallyContacts] of contactsByRally) {
    const rally = rallyMap.get(key);
    if (!rally) continue;

    // Find the serve-receive pass (rating 1-3; skip 0 = ace against us)
    const pass = rallyContacts
      .filter((c) => c.action === 'pass' && parseInt(c.result, 10) >= 1)
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0))[0];
    if (!pass) continue;

    const rating = parseInt(pass.result, 10);
    const isIS = rating === 3;

    // Collect all offensive contacts after the pass, sorted earliest-first.
    // We then pick the terminal one: first kill, then first error, then last
    // attempt. This handles multi-swing rallies where an earlier "attempt"
    // precedes the eventual kill rather than locking in a 0-kill result.
    const passTs = pass.timestamp ?? 0;
    const attacks = rallyContacts
      .filter((c) => {
        const ts = c.timestamp ?? 0;
        if (ts <= passTs) return false;
        return (
          c.action === 'attack' ||
          (c.action === 'set' && c.result === 'ball_handling_error')
        );
      })
      .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
    if (!attacks.length) continue;

    const atk =
      attacks.find((c) => c.result === 'kill') ??
      attacks.find((c) => c.result === 'error' || c.result === 'ball_handling_error') ??
      attacks[attacks.length - 1];

    const won  = rally.point_winner === 'us' ? 1 : 0;
    const isK  = atk.result === 'kill';
    const isAE = atk.result === 'error' || atk.result === 'ball_handling_error';

    const bucket   = isIS ? 'is' : 'oos';
    const rotSlot  = byRotation[pass.rotation_num];
    const acc = (s) => { s.ta++; if (isK) s.k++; if (isAE) s.ae++; s.win += won; };
    acc(total[bucket]);
    if (rotSlot) acc(rotSlot[bucket]);
  }

  // Derive percentage fields
  const derive = (s) => ({
    ...s,
    k_pct:   div(s.k, s.ta),
    hit_pct: div(s.k - s.ae, s.ta),
    win_pct: div(s.win, s.ta),
  });
  const deriveGroup = (g) => ({ is: derive(g.is), oos: derive(g.oos) });

  return {
    byRotation: Object.fromEntries(Object.entries(byRotation).map(([r, g]) => [r, deriveGroup(g)])),
    total:      deriveGroup(total),
  };
}

/**
 * Transition / Free Ball first-ball offense stats.
 *
 * For each dig in a rally, look for the FIRST offensive contact after that dig
 * and before the next dig (by timestamp). That one contact is the offensive
 * result of that dig sequence. If the ball comes back later with another dig,
 * that starts a new sequence.
 *
 *   dig result='freeball' → FREE bucket
 *   dig result='success'  → TRANSITION bucket  (freeball dig is FREE only, not both)
 *
 * "First offensive contact":
 *   action='attack'                             → TA (K if kill, AE if error)
 *   action='set', result='ball_handling_error'  → TA + AE (BHE / lift / net)
 *
 * Stats per slot: ta, k, ae, win, k_pct, hit_pct, win_pct
 *
 * Returns {
 *   free:       { total: {...}, byRotation: {1..6: same} },
 *   transition: { total: ..., byRotation: ... }
 * }
 */
export function computeTransitionAttack(contacts, rallies, rallyMap = buildRallyMap(rallies)) {
  const contactsByRally = groupContactsByRally(contacts, true);

  const mkSlot  = () => ({ ta: 0, k: 0, ae: 0, win: 0 });
  const mkGroup = () => ({
    total:      mkSlot(),
    byRotation: Object.fromEntries(Array.from({ length: 6 }, (_, i) => [i + 1, mkSlot()])),
  });
  const free       = mkGroup();
  const transition = mkGroup();

  for (const [key, rallyContacts] of contactsByRally) {
    const rally = rallyMap.get(key);
    if (!rally) continue;
    const won = rally.point_winner === 'us' ? 1 : 0;

    // All digs (success or freeball) sorted by timestamp
    const digs = rallyContacts.filter(
      (c) => c.action === 'dig' && (c.result === 'success' || c.result === 'freeball')
    );
    if (!digs.length) continue;

    for (let i = 0; i < digs.length; i++) {
      const dig    = digs[i];
      const nextDig = digs[i + 1];
      const digTs  = dig.timestamp ?? 0;
      const nextTs = nextDig != null ? (nextDig.timestamp ?? Infinity) : Infinity;

      // Collect all offensive contacts in the dig window, then pick the
      // terminal one: first kill, then first error, then last attempt.
      const attacks = rallyContacts.filter((c) => {
        const ts = c.timestamp ?? 0;
        if (ts <= digTs || ts >= nextTs) return false;
        return (
          c.action === 'attack' ||
          (c.action === 'set' && c.result === 'ball_handling_error')
        );
      });
      if (!attacks.length) continue;

      const atk =
        attacks.find((c) => c.result === 'kill') ??
        attacks.find((c) => c.result === 'error' || c.result === 'ball_handling_error') ??
        attacks[attacks.length - 1];

      const isK  = atk.result === 'kill';
      const isAE = atk.result === 'error' || atk.result === 'ball_handling_error';
      const rot  = dig.rotation_num;
      const group = dig.result === 'freeball' ? free : transition;

      group.total.ta++;
      if (isK)  group.total.k++;
      if (isAE) group.total.ae++;
      group.total.win += won;
      if (rot >= 1 && rot <= 6) {
        group.byRotation[rot].ta++;
        if (isK)  group.byRotation[rot].k++;
        if (isAE) group.byRotation[rot].ae++;
        group.byRotation[rot].win += won;
      }
    }
  }

  const derive = (s) => ({
    ...s,
    hit_pct: div(s.k - s.ae, s.ta),
    k_pct:   div(s.k, s.ta),
    win_pct: div(s.win, s.ta),
  });
  const deriveGroup = (g) => ({
    total:      derive(g.total),
    byRotation: Object.fromEntries(Object.entries(g.byRotation).map(([r, s]) => [r, derive(s)])),
  });

  return { free: deriveGroup(free), transition: deriveGroup(transition) };
}

/**
 * Scoring run breakdown by rotation.
 * A run = 2+ consecutive rallies won by us. Runs reset at set boundaries.
 * "Belongs to" the rotation where the run started.
 *
 * Returns { byRotation: { 1..6: { max_run, avg_run, runs_3plus, runs_5plus, total_runs } }, total: same }
 */
export function computeRunsByRotation(rallies) {
  const sorted = [...rallies].sort((a, b) =>
    a.set_id !== b.set_id ? a.set_id - b.set_id : a.rally_number - b.rally_number
  );

  const mkSlot = () => ({ max_run: 0, total_runs: 0, run_pts: 0, runs_3plus: 0, runs_5plus: 0, runs_7plus: 0, runs_9plus: 0 });
  const byRotation = {};
  for (let r = 1; r <= 6; r++) byRotation[r] = mkSlot();
  const tot = mkSlot();

  const record = (len, rot) => {
    if (len < 2) return;
    const add = (s) => {
      s.max_run = Math.max(s.max_run, len);
      s.total_runs++; s.run_pts += len;
      if (len >= 3) s.runs_3plus++;
      if (len >= 5) s.runs_5plus++;
      if (len >= 7) s.runs_7plus++;
      if (len >= 9) s.runs_9plus++;
    };
    if (rot >= 1 && rot <= 6) add(byRotation[rot]);
    add(tot);
  };

  let len = 0, startRot = null, prevSetId = null;
  for (const rally of sorted) {
    if (rally.set_id !== prevSetId) { record(len, startRot); len = 0; startRot = null; prevSetId = rally.set_id; }
    if (rally.point_winner === 'us') {
      if (len === 0) startRot = rally.our_rotation;
      len++;
    } else { record(len, startRot); len = 0; startRot = null; }
  }
  record(len, startRot);

  const derive = (s) => ({ ...s, avg_run: s.total_runs > 0 ? s.run_pts / s.total_runs : null });
  return {
    byRotation: Object.fromEntries(Object.entries(byRotation).map(([r, s]) => [r, derive(s)])),
    total: derive(tot),
  };
}

/**
 * Free-ball dig win stats.
 * FREE dig = action 'dig', result 'freeball'.
 * Returns { byRotation: { 1..6: { fb_dig, fb_won } }, total: same }
 */
export function computeFreeDigWin(contacts, rallies, rallyMap = buildRallyMap(rallies)) {
  const mkSlot = () => ({ fb_dig: 0, fb_won: 0 });
  const byRotation = {};
  for (let r = 1; r <= 6; r++) byRotation[r] = mkSlot();
  const total = mkSlot();

  for (const c of contacts) {
    if (c.opponent_contact || c.action !== 'dig' || c.result !== 'freeball') continue;
    const rally = rallyMap.get(`${c.set_id}_${c.rally_number}`);
    if (!rally) continue;
    const won = rally.point_winner === 'us' ? 1 : 0;
    const slot = byRotation[c.rotation_num];
    if (slot) { slot.fb_dig++; slot.fb_won += won; }
    total.fb_dig++; total.fb_won += won;
  }

  return { byRotation, total };
}

/**
 * Freeball outcome stats — requires both contacts AND rallies arrays
 * so the caller (match or season) can pass already-fetched data.
 *
 * FBO% = rallies where our freeball_receive → we scored / total freeball_receive contacts
 * FBD% = rallies where we sent freeball → we won the point / total freeball_send contacts
 */
export function computeFreeballOutcomes(contacts, rallies, rallyMap = buildRallyMap(rallies)) {
  let fbr = 0, fbrWin = 0, fbs = 0, fbsWin = 0;
  for (const c of contacts) {
    if (c.opponent_contact) continue;
    const rally = rallyMap.get(`${c.set_id}_${c.rally_number}`);
    if (!rally) continue;
    if (c.action === 'freeball_receive') {
      fbr++;
      if (rally.point_winner === 'us') fbrWin++;
    } else if (c.action === 'freeball_send') {
      fbs++;
      if (rally.point_winner === 'us') fbsWin++;
    }
  }
  return {
    fbr, fbs,
    fbo_pct: div(fbrWin, fbr),
    fbd_pct: div(fbsWin, fbs),
  };
}

/**
 * Dig-to-Kill% — for each transition dig, did the next attack result in a kill?
 *
 * A "transition dig" is action=dig, result=success (not freeball).
 * For each dig window (dig → next dig or end of rally), we find the terminal
 * attack and record whether it was a kill. Tracks per digger and team total.
 *
 * Returns { byPlayer: { [pid]: { dg, dg_k, dg_win, dg_k_pct, dg_win_pct } }, team: same }
 */
export function computeDigToKill(contacts, rallies, rallyMap = buildRallyMap(rallies)) {
  const contactsByRally = groupContactsByRally(contacts, true);
  const byPlayer = {};
  const team = { dg: 0, dg_k: 0, dg_win: 0 };

  for (const [key, rallyContacts] of contactsByRally) {
    const rally = rallyMap.get(key);
    if (!rally) continue;
    const won = rally.point_winner === 'us' ? 1 : 0;

    const digs = rallyContacts.filter(c => c.action === 'dig' && c.result === 'success');
    if (!digs.length) continue;

    for (let i = 0; i < digs.length; i++) {
      const dig    = digs[i];
      const nextDig = digs[i + 1];
      const digTs  = dig.timestamp ?? 0;
      const nextTs = nextDig != null ? (nextDig.timestamp ?? Infinity) : Infinity;

      const attacks = rallyContacts.filter(c => {
        const ts = c.timestamp ?? 0;
        return ts > digTs && ts < nextTs && (
          c.action === 'attack' ||
          (c.action === 'set' && c.result === 'ball_handling_error')
        );
      });
      if (!attacks.length) continue;

      const atk =
        attacks.find(c => c.result === 'kill') ??
        attacks.find(c => c.result === 'error' || c.result === 'ball_handling_error') ??
        attacks[attacks.length - 1];

      const isK = atk.result === 'kill';
      const pid = String(dig.player_id);

      if (!byPlayer[pid]) byPlayer[pid] = { dg: 0, dg_k: 0, dg_win: 0 };
      byPlayer[pid].dg++;
      if (isK) byPlayer[pid].dg_k++;
      byPlayer[pid].dg_win += won;

      team.dg++;
      if (isK) team.dg_k++;
      team.dg_win += won;
    }
  }

  for (const s of Object.values(byPlayer)) {
    s.dg_k_pct   = div(s.dg_k,   s.dg);
    s.dg_win_pct = div(s.dg_win, s.dg);
  }

  return {
    byPlayer,
    team: { ...team, dg_k_pct: div(team.dg_k, team.dg), dg_win_pct: div(team.dg_win, team.dg) },
  };
}

/**
 * Point-quality breakdown for a contacts array.
 * Returns earned / given / free detail objects and totals.
 *
 * EARNED  — our team actively scores: ACE, K, SBLK, HBLK
 * GIVEN   — our errors concede a point: SE, AE, P0, Lift, Dbl, Net
 * FREE    — opponent errors give us a point: opp SE, AE, BHE, Net
 */
export function computePointQuality(contacts) {
  const earned = { ace: 0, k: 0, sblk: 0, hblk: 0 };
  const given  = { se: 0, ae: 0, p0: 0, lift: 0, dbl: 0, net: 0, rot: 0 };
  const free   = { se: 0, ae: 0, bhe: 0, net: 0 };

  for (const c of contacts) {
    if (c.opponent_contact) {
      if      (c.action === 'serve'  && c.result === 'error')               free.se++;
      else if (c.action === 'attack' && c.result === 'error')               free.ae++;
      else if (c.action === 'error'  && c.result === 'ball_handling_error') free.bhe++;
      else if (c.action === 'error'  && c.result === 'net')                 free.net++;
    } else {
      if      (c.action === 'serve'  && c.result === 'ace')    earned.ace++;
      else if (c.action === 'attack' && c.result === 'kill')   earned.k++;
      else if (c.action === 'block'  && c.result === 'solo')   earned.sblk++;
      else if (c.action === 'block'  && c.result === 'assist') earned.hblk += 0.5; // 2 contacts per event → each counts 0.5

      if      (c.action === 'serve'  && c.result === 'error')  given.se++;
      else if (c.action === 'attack' && c.result === 'error')  given.ae++;
      else if (c.action === 'pass'   && c.result === '0')      given.p0++;
      else if (c.action === 'error'  && c.result === 'lift')   given.lift++;
      else if (c.action === 'error'  && c.result === 'double') given.dbl++;
      else if (c.action === 'error'  && c.result === 'net')              given.net++;
      else if (c.action === 'error'  && c.result === 'rotation_error')  given.rot++;
    }
  }

  const earnedTotal = earned.ace + earned.k + earned.sblk + earned.hblk;
  const givenTotal  = given.se + given.ae + given.p0 + given.lift + given.dbl + given.net + given.rot;
  const freeTotal   = free.se + free.ae + free.bhe + free.net;
  const scored      = earnedTotal + freeTotal;

  return {
    earned: { ...earned, total: earnedTotal },
    given:  { ...given,  total: givenTotal  },
    free:   { ...free,   total: freeTotal   },
    scored,
    earned_pct: scored > 0 ? earnedTotal / scored : null,
    free_pct:   scored > 0 ? freeTotal   / scored : null,
  };
}

/**
 * Kill% and Hit% by pass rating (xK%, xHIT%) — per attacker.
 * For each rally containing a rated pass (1/2/3), finds the first attack
 * by any of our players after that pass and tracks k/ae/ta per rating.
 * Returns { [playerId]: { xk1, xk1_ta, xk2, xk2_ta, xk3, xk3_ta,
 *                         xhit1, xhit2, xhit3 } }
 */
export function computeXKByPassRating(contacts) {
  const byRally = new Map();
  for (const c of contacts) {
    if (c.opponent_contact) continue;
    const key = `${c.set_id}:${c.rally_number}`;
    if (!byRally.has(key)) byRally.set(key, []);
    byRally.get(key).push(c);
  }

  const acc = {};
  for (const rallyContacts of byRally.values()) {
    const sorted = rallyContacts.slice().sort((a, b) => (a.timestamp ?? a.id ?? 0) - (b.timestamp ?? b.id ?? 0));

    const passIdx = sorted.findIndex(c => c.action === 'pass' && ['1', '2', '3'].includes(String(c.result)));
    if (passIdx === -1) continue;

    const rating = String(sorted[passIdx].result);
    const firstAttack = sorted.slice(passIdx + 1).find(c => c.action === 'attack' && c.player_id);
    if (!firstAttack) continue;

    const pid = String(firstAttack.player_id);
    acc[pid] ??= { '1': { ta: 0, k: 0, ae: 0 }, '2': { ta: 0, k: 0, ae: 0 }, '3': { ta: 0, k: 0, ae: 0 } };
    acc[pid][rating].ta++;
    if (firstAttack.result === 'kill')  acc[pid][rating].k++;
    if (firstAttack.result === 'error') acc[pid][rating].ae++;
  }

  const result = {};
  for (const [pid, ratings] of Object.entries(acc)) {
    result[pid] = {};
    for (const r of ['1', '2', '3']) {
      const { ta, k, ae } = ratings[r];
      result[pid][`xk${r}_ta`]  = ta;
      result[pid][`xk${r}_k`]   = k;
      result[pid][`xk${r}_ae`]  = ae;
      result[pid][`xk${r}`]     = ta > 0 ? k / ta : null;
      result[pid][`xhit${r}`]   = ta > 0 ? (k - ae) / ta : null;
    }
  }
  return result;
}

export function aggregateXKTeamStats(rows) {
  const totals = { '1': { ta: 0, k: 0, ae: 0 }, '2': { ta: 0, k: 0, ae: 0 }, '3': { ta: 0, k: 0, ae: 0 } };
  for (const x of rows) {
    for (const r of ['1', '2', '3']) {
      totals[r].ta += x[`xk${r}_ta`] ?? 0;
      totals[r].k  += x[`xk${r}_k`]  ?? 0;
      totals[r].ae += x[`xk${r}_ae`] ?? 0;
    }
  }
  return {
    xk1:    totals['1'].ta > 0 ? totals['1'].k / totals['1'].ta : null,
    xk2:    totals['2'].ta > 0 ? totals['2'].k / totals['2'].ta : null,
    xk3:    totals['3'].ta > 0 ? totals['3'].k / totals['3'].ta : null,
    xhit1:  totals['1'].ta > 0 ? (totals['1'].k - totals['1'].ae) / totals['1'].ta : null,
    xhit2:  totals['2'].ta > 0 ? (totals['2'].k - totals['2'].ae) / totals['2'].ta : null,
    xhit3:  totals['3'].ta > 0 ? (totals['3'].k - totals['3'].ae) / totals['3'].ta : null,
    xk1_ta: totals['1'].ta,
    xk2_ta: totals['2'].ta,
    xk3_ta: totals['3'].ta,
  };
}

// ── Async convenience (report mode) ────────────────────────────────────────

/**
 * Fetches and computes all stats for a single match.
 * Returns { players, team, rotation, freeball, setsPlayed }
 */
export async function computeMatchStats(matchId) {
  const [contacts, rallies, setsPlayed, playerPositions, timeouts] = await Promise.all([
    getContactsForMatch(matchId),
    getRalliesForMatch(matchId),
    getSetsPlayedCount(matchId),
    getPlayerPositionsForMatches([matchId]),
    getTimeoutsForMatches([matchId]),
  ]);
  const rallyMap = buildRallyMap(rallies);
  const players = computePlayerStats(contacts, setsPlayed, playerPositions);
  const xkStats = computeXKByPassRating(contacts);
  for (const [pid, xk] of Object.entries(xkStats)) {
    if (players[pid]) Object.assign(players[pid], xk);
  }
  const { p, q } = computePQ(rallies);
  const wpaStats = computePlayerWPA(contacts, rallies, p, q);
  for (const [pid, wpa] of Object.entries(wpaStats)) {
    if (players[pid]) Object.assign(players[pid], wpa);
  }
  const digToKill = computeDigToKill(contacts, rallies, rallyMap);
  for (const [pid, dg] of Object.entries(digToKill.byPlayer)) {
    if (players[pid]) Object.assign(players[pid], dg);
  }
  return {
    players,
    team:             computeTeamStats(contacts, setsPlayed),
    opp:              computeOppDisplayStats(contacts),
    serveZones:       computeServeZoneStats(contacts),
    rotation:         computeRotationStats(rallies),
    freeball:         computeFreeballOutcomes(contacts, rallies, rallyMap),
    isOos:            computeISvsOOS(contacts, rallies, rallyMap),
    transitionAttack: computeTransitionAttack(contacts, rallies, rallyMap),
    freeDigWin:       computeFreeDigWin(contacts, rallies, rallyMap),
    digToKill,
    runs:             computeRunsByRotation(rallies),
    pointQuality:     computePointQuality(contacts),
    servingPoints:    computeServingPoints(rallies),
    timeoutEffect:    computeTimeoutEffectiveness(timeouts, rallies),
    timeouts,
    setsPlayed,
    contacts,
  };
}

/**
 * Fetches and aggregates all stats for an entire season.
 * Optional filters: { conference: 'conference'|'non-con', location: 'home'|'away'|'neutral', matchType: string, result: 'win'|'loss' }
 * Returns { players, team, rotation, freeball, setsPlayed, matchCount, totalMatchCount }
 * or null if no matches exist, or { empty: true, totalMatchCount } if filters exclude all matches.
 */
export async function computeSeasonStats(seasonId, filters = {}) {
  let matches = await getMatchesForSeason(seasonId);
  if (!matches.length) return null;

  const totalMatchCount = matches.length;

  if (filters.matchIds?.length || filters.conference || filters.location || filters.matchType?.length || filters.result) {
    matches = matches.filter(m => {
      if (filters.matchIds?.length  && !filters.matchIds.includes(m.id)) return false;
      if (filters.conference        && m.conference !== filters.conference) return false;
      if (filters.location          && m.location   !== filters.location)  return false;
      if (filters.matchType?.length && !filters.matchType.includes(m.match_type ?? 'reg-season')) return false;
      if (filters.result === 'win'  && !((m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0))) return false;
      if (filters.result === 'loss' && !((m.our_sets_won ?? 0) < (m.opp_sets_won ?? 0))) return false;
      return true;
    });
  }

  if (!matches.length) return { empty: true, totalMatchCount };

  const matchIds = matches.map(m => m.id);
  // Exclude scheduled (future) matches from denominators — they have no sets/data yet.
  const playedMatchIds = matches
    .filter(m => m.status !== MATCH_STATUS.SCHEDULED)
    .map(m => m.id);
  const [contacts, rallies, setsPerMatch, playerPositions, oppScored, ourScored, timeouts] = await Promise.all([
    getContactsForMatches(matchIds),
    getRalliesForMatches(matchIds),
    getBatchSetsPlayedCount(playedMatchIds),
    getPlayerPositionsForMatches(matchIds),
    getOppScoredForMatches(matchIds),
    getOurScoredForMatches(matchIds),
    getTimeoutsForMatches(matchIds),
  ]);
  const setsPlayed = Object.values(setsPerMatch).reduce((a, b) => a + b, 0);

  const rallyMap = buildRallyMap(rallies);
  const players = computePlayerStats(contacts, setsPlayed, playerPositions);
  const xkStats = computeXKByPassRating(contacts);
  for (const [pid, xk] of Object.entries(xkStats)) {
    if (players[pid]) Object.assign(players[pid], xk);
  }
  const { p: seasonP, q: seasonQ } = computePQ(rallies);
  const wpaStats = computePlayerWPA(contacts, rallies, seasonP, seasonQ);
  for (const [pid, wpa] of Object.entries(wpaStats)) {
    if (players[pid]) Object.assign(players[pid], wpa);
  }
  const digToKillSeason = computeDigToKill(contacts, rallies, rallyMap);
  for (const [pid, dg] of Object.entries(digToKillSeason.byPlayer)) {
    if (players[pid]) Object.assign(players[pid], dg);
  }
  const wins   = matches.filter(m => m.status !== MATCH_STATUS.SCHEDULED && (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
  const losses = matches.filter(m => m.status !== MATCH_STATUS.SCHEDULED && (m.our_sets_won ?? 0) < (m.opp_sets_won ?? 0)).length;
  return {
    players,
    team:             computeTeamStats(contacts, setsPlayed),
    opp:              computeOppDisplayStats(contacts),
    rotation:         computeRotationStats(rallies),
    freeball:         computeFreeballOutcomes(contacts, rallies, rallyMap),
    isOos:            computeISvsOOS(contacts, rallies, rallyMap),
    transitionAttack: computeTransitionAttack(contacts, rallies, rallyMap),
    freeDigWin:       computeFreeDigWin(contacts, rallies, rallyMap),
    digToKill:        digToKillSeason,
    runs:             computeRunsByRotation(rallies),
    pointQuality:     computePointQuality(contacts),
    servingPoints:    computeServingPoints(rallies),
    timeoutEffect:    computeTimeoutEffectiveness(timeouts, rallies),
    trends:           computePlayerTrends(matches.filter(m => m.status !== MATCH_STATUS.SCHEDULED), contacts, setsPerMatch, playerPositions),
    setsPlayed,
    matchCount:       playedMatchIds.length,
    totalMatchCount,
    wins,
    losses,
    oppScored,
    ourScored,
    contacts,
    rallies,
  };
}

/**
 * Breaks down per-player stats match-by-match from pre-fetched season data.
 * No extra DB queries — all inputs are already available from computeSeasonStats.
 * Returns { matches: [{id, date, opponentName}], byPlayer: {[pid]: Array<row|null>} }
 * Each byPlayer array is index-aligned to the matches array.
 */
export function computePlayerTrends(matches, contacts, setsPerMatch, playerPositions) {
  const sorted = [...matches].sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  const byMatch = {};
  for (const c of contacts) {
    (byMatch[c.match_id] ??= []).push(c);
  }

  // Pass 1: compute per-match stats and collect all player IDs up front.
  // Avoids the O(n²) new Array(i).fill(null) pattern for late-discovered players.
  const allPlayerIds = new Set();
  const contactsByMatch = [];
  const statsByMatch = sorted.map((match) => {
    const mc = byMatch[match.id] ?? [];
    const sp = setsPerMatch[match.id] ?? 1;
    const ms = computePlayerStats(mc, sp, playerPositions);
    for (const pid of Object.keys(ms)) allPlayerIds.add(pid);
    contactsByMatch.push(mc);
    return ms;
  });

  // Pass 2: build aligned arrays — one slot per match, null if player absent.
  const byPlayer = {};
  for (const pid of allPlayerIds) byPlayer[pid] = [];
  for (let i = 0; i < sorted.length; i++) {
    const matchId = sorted[i].id;
    const ms = statsByMatch[i];
    for (const pid of allPlayerIds) {
      const rotApr = ms[pid] ? computePlayerRotationPassing(contactsByMatch[i], Number(pid)) : null;
      byPlayer[pid].push(ms[pid] ? { matchId, ...ms[pid], ...rotApr } : null);
    }
  }

  return {
    matches:  sorted.map(m => ({ id: m.id, date: m.date, opponentName: m.opponent_name ?? '', opponentAbbr: m.opponent_abbr ?? '' })),
    byPlayer,
  };
}

// ── Per-zone serve stats ──────────────────────────────────────────────────────
export function computeServeZoneStats(contacts) {
  const zones = {};
  for (let z = 1; z <= 6; z++) zones[z] = { sa: 0, ace: 0, se: 0 };
  for (const c of contacts) {
    if (c.action !== 'serve' || c.opponent_contact || !c.zone) continue;
    const z = zones[c.zone];
    if (!z) continue;
    z.sa++;
    if (c.result === 'ace')   z.ace++;
    if (c.result === 'error') z.se++;
  }
  return Object.fromEntries(
    Object.entries(zones).map(([zone, s]) => [Number(zone), {
      sa: s.sa, ace: s.ace, se: s.se,
      ace_pct: s.sa ? Math.round(s.ace / s.sa * 100) : 0,
      si_pct:  s.sa ? Math.round((s.sa - s.se) / s.sa * 100) : 0,
    }])
  );
}

// ── Set-by-Set Trend Chart data ───────────────────────────────────────────────
export function computeSetTrends(contacts, sets) {
  if (!contacts?.length || !sets?.length) return [];
  const setNumById = Object.fromEntries(sets.map(s => [s.id, s.set_number]));
  const bySet = {};
  for (const c of contacts) {
    const sn = setNumById[c.set_id];
    if (!sn) continue;
    if (!bySet[sn]) bySet[sn] = { ta: 0, k: 0, ae: 0, pa: 0, p0: 0, p1: 0, p2: 0, p3: 0, sa: 0, ace: 0, se: 0 };
    const s = bySet[sn];
    if (c.action === 'attack') {
      s.ta++; if (c.result === 'kill') s.k++; if (c.result === 'error') s.ae++;
    } else if (c.action === 'pass') {
      s.pa++;
      if (c.result === '0') s.p0++;
      else if (c.result === '1') s.p1++;
      else if (c.result === '2') s.p2++;
      else if (c.result === '3') s.p3++;
    } else if (c.action === 'serve') {
      s.sa++; if (c.result === 'ace') s.ace++; if (c.result === 'error') s.se++;
    }
  }
  return Object.entries(bySet)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([sn, s]) => ({
      name:  `Set ${sn}`,
      'K%':  s.ta ? Math.round(s.k / s.ta * 100) : 0,
      'HIT%': s.ta ? Math.round((s.k - s.ae) / s.ta * 100) : 0,
      'APR': s.pa ? Math.round(((s.p1 * 1 + s.p2 * 2 + s.p3 * 3) / s.pa) * 100) / 100 : 0,
      'ACE%': s.sa ? Math.round(s.ace / s.sa * 100) : 0,
      'SE%':  s.sa ? Math.round(s.se  / s.sa * 100) : 0,
    }));
}

// ── Rally Length Histogram data ───────────────────────────────────────────────
const RALLY_BUCKETS = [
  { label: '1',    min: 1,  max: 1         },
  { label: '2–3',  min: 2,  max: 3         },
  { label: '4–6',  min: 4,  max: 6         },
  { label: '7–10', min: 7,  max: 10        },
  { label: '11+',  min: 11, max: Infinity  },
];

// ── Win Probability — Markov chain model ─────────────────────────────────────
// p = sideout rate  (P we win rally | serve_side = 'them')
// q = break rate    (P we win rally | serve_side = 'us')
// Fallback defaults from HS volleyball averages when no prior is available.
const WP_FALLBACK_P = 0.58;
const WP_FALLBACK_Q = 0.42;
// Bayesian prior strength — equivalent number of "virtual" prior rallies.
// At K live rallies the estimate is 50% prior / 50% observed.
const BAYES_K     = 15; // global p,q blend
const ROT_BAYES_K = 8;  // per-rotation blend (fewer rallies per rotation)

// Bayesian-blended p,q. priorP/priorQ are the season-history rates used as the
// prior; when omitted, the global HS fallback is used. The blend is continuous:
// at 0 live rallies the estimate equals the prior; it converges to observed data
// as rallies accumulate. No hard cutoff — estimates are always calibrated.
// alpha < 1 applies exponential recency decay so recent rallies carry more weight.
// alpha = 1 (default) gives equal weight to all rallies — backward-compatible for
// historical / report contexts. For live set estimation use alpha = 0.93.
export function computePQ(rallies, priorP = WP_FALLBACK_P, priorQ = WP_FALLBACK_Q, alpha = 1) {
  const pp = priorP ?? WP_FALLBACK_P;
  const pq = priorQ ?? WP_FALLBACK_Q;
  if (!rallies?.length) {
    return { p: pp, q: pq, pAlpha: pp * BAYES_K, pBeta: (1 - pp) * BAYES_K, qAlpha: pq * BAYES_K, qBeta: (1 - pq) * BAYES_K };
  }
  const sorted = alpha < 1
    ? [...rallies].sort((a, b) =>
        a.set_id !== b.set_id ? a.set_id - b.set_id : a.rally_number - b.rally_number)
    : rallies;
  const n = sorted.length;
  let recvTotalW = 0, recvWinW = 0, servTotalW = 0, servWinW = 0;
  sorted.forEach((r, i) => {
    const w = alpha < 1 ? Math.pow(alpha, n - 1 - i) : 1;
    if (r.serve_side === 'them') {
      recvTotalW += w;
      if (r.point_winner === 'us') recvWinW += w;
    } else if (r.serve_side === 'us') {
      servTotalW += w;
      if (r.point_winner === 'us') servWinW += w;
    }
  });
  // Posterior mean of Beta(α₀ + wins, β₀ + losses) where α₀ = pp*K, β₀ = (1-pp)*K.
  // pAlpha/pBeta/qAlpha/qBeta are that full Beta shape, not just its mean — kept
  // alongside p/q so callers that need to know *how sure* the estimate is (see
  // computeSetWinProbUncertain below) don't have to redo this blend themselves.
  const pAlpha = pp * BAYES_K + recvWinW, pBeta = (1 - pp) * BAYES_K + (recvTotalW - recvWinW);
  const qAlpha = pq * BAYES_K + servWinW, qBeta = (1 - pq) * BAYES_K + (servTotalW - servWinW);
  return { p: pAlpha / (pAlpha + pBeta), q: qAlpha / (qAlpha + qBeta), pAlpha, pBeta, qAlpha, qBeta };
}

// Compute per-rotation Bayesian-blended SO%/BP% rates.
// seasonRotation: output of computeRotationStats() from season history (prior).
// liveRallies: rallies from the current set (evidence).
// priorP/priorQ: global fallback rates when a rotation has no season history.
export function computeRotationPQ(seasonRotation, liveRallies, priorP = WP_FALLBACK_P, priorQ = WP_FALLBACK_Q) {
  const pp = priorP ?? WP_FALLBACK_P;
  const pq = priorQ ?? WP_FALLBACK_Q;
  const liveRot = computeRotationStats(liveRallies ?? []);
  const byRotation = {};
  for (let r = 1; r <= 6; r++) {
    const szn  = seasonRotation?.rotations?.[r];
    const live = liveRot?.rotations?.[r];
    const seasonSo = szn?.so_pct ?? pp;
    const seasonBp = szn?.bp_pct ?? pq;
    const liveSoOpp = live?.so_opp ?? 0;
    const liveSoWin = live?.so_win ?? 0;
    const liveBpOpp = live?.bp_opp ?? 0;
    const liveBpWin = live?.bp_win ?? 0;
    byRotation[r] = {
      so_pct: (seasonSo * ROT_BAYES_K + liveSoWin) / (ROT_BAYES_K + liveSoOpp),
      bp_pct: (seasonBp * ROT_BAYES_K + liveBpWin) / (ROT_BAYES_K + liveBpOpp),
    };
  }
  return byRotation;
}

// Rotation-aware set win probability.
// rotationRates: { 1..6: { so_pct, bp_pct } } from computeRotationPQ.
// startRot: the rotation number we are currently in (1–6).
// State: (ourScore, oppScore, ourRotation, serveSide).
// Our rotation advances only when we sideout (win on their serve).
export function computeSetWinProbRotation(rotationRates, ourScore, oppScore, startRot, serveSide, isDecider = false) {
  const target = isDecider ? 15 : 25;
  const rot0   = startRot ?? 1;
  const memo   = new Map();

  function dp(s1, s2, rot, side) {
    if (s1 >= target && s1 >= s2 + 2) return 1;
    if (s2 >= target && s2 >= s1 + 2) return 0;
    if (s1 > 50 || s2 > 50) return 0.5;
    const key = `${s1},${s2},${rot},${side}`;
    if (memo.has(key)) return memo.get(key);
    const rates = rotationRates?.[rot] ?? rotationRates?.[1] ?? { so_pct: WP_FALLBACK_P, bp_pct: WP_FALLBACK_Q };
    const w = side === 'them' ? rates.so_pct : rates.bp_pct;
    let val;
    if (side === 'them') {
      // Sideout: our rotation advances, we serve next
      const nextRot = (rot % 6) + 1;
      val = w * dp(s1 + 1, s2, nextRot, 'us') + (1 - w) * dp(s1, s2 + 1, rot, 'them');
    } else {
      // Hold serve: rotation unchanged. Lose: they sideout, our rotation still unchanged
      val = w * dp(s1 + 1, s2, rot, 'us') + (1 - w) * dp(s1, s2 + 1, rot, 'them');
    }
    memo.set(key, val);
    return val;
  }

  const side = serveSide === 'us' ? 'us' : 'them';
  return dp(ourScore, oppScore, rot0, side);
}

// Expected points scored by us when starting a set at 0–0 in a given rotation / serve side.
// Uses the same rotation-cycling DP as computeSetWinProbRotation but returns E[our_score].
export function computeExpectedPts(rotationRates, startRot, serveSide, isDecider = false) {
  const target = isDecider ? 15 : 25;
  const memo = new Map();

  function dp(s1, s2, rot, side) {
    if (s1 >= target && s1 - s2 >= 2) return s1;
    if (s2 >= target && s2 - s1 >= 2) return s1;
    if (s1 > 50 || s2 > 50) return s1;
    const key = `${s1},${s2},${rot},${side}`;
    if (memo.has(key)) return memo.get(key);
    const rates = rotationRates?.[rot] ?? { so_pct: WP_FALLBACK_P, bp_pct: WP_FALLBACK_Q };
    const w = side === 'them' ? rates.so_pct : rates.bp_pct;
    let val;
    if (side === 'them') {
      const nextRot = (rot % 6) + 1;
      val = w * dp(s1 + 1, s2, nextRot, 'us') + (1 - w) * dp(s1, s2 + 1, rot, 'them');
    } else {
      val = w * dp(s1 + 1, s2, rot, 'us') + (1 - w) * dp(s1, s2 + 1, rot, 'them');
    }
    memo.set(key, val);
    return val;
  }

  return dp(0, 0, startRot ?? 1, serveSide === 'us' ? 'us' : 'them');
}

export function computeSetWinProb(p, q, ourScore, oppScore, serveSide, isDecider = false, externalMemo = null) {
  const target = isDecider ? 15 : 25;
  // Callers that re-evaluate the same (p, q) many times (e.g. computePlayerWPA across
  // a whole season) can pass their own persistent Map so repeated states aren't re-solved.
  const memo = externalMemo ?? new Map();

  function dp(s1, s2, side) {
    if (s1 >= target && s1 >= s2 + 2) return 1;
    if (s2 >= target && s2 >= s1 + 2) return 0;
    // Safety cap for extended deuce
    if (s1 > 50 || s2 > 50) return 0.5;
    const key = `${s1},${s2},${side}`;
    if (memo.has(key)) return memo.get(key);
    // winProb: P we win this rally
    const w = side === 'us' ? q : p;
    // If we win: we score and we serve next (sideout: side flips to us; break: stays us)
    // If we lose: they score and they serve next
    const val = w * dp(s1 + 1, s2, 'us') + (1 - w) * dp(s1, s2 + 1, 'them');
    memo.set(key, val);
    return val;
  }

  const startSide = serveSide === 'us' ? 'us' : serveSide === 'them' ? 'them' : 'us';
  return dp(ourScore, oppScore, startSide);
}

// ── Uncertainty-aware set win probability ────────────────────────────────────
// computeSetWinProb() above treats p/q as certain, but they're really just the
// mean of a Beta-distributed estimate — most sharply wrong early in a season or
// against a new opponent, where the estimate rests on very little evidence.
// Plugging a single point estimate into a nonlinear win-probability curve
// systematically overstates confidence (measured directly against a real
// season: see MATCH_WP_CALIBRATION below). This version instead averages the
// same DP across a fixed grid of plausible p/q values drawn from that Beta
// uncertainty, so a confident estimate (lots of evidence, narrow spread) and a
// shaky one (little evidence, wide spread) no longer produce equally-certain
// output from the same mean.
//
// Numerical Recipes' standard continued-fraction incomplete beta function —
// used only to invert the Beta CDF for a handful of quantile points below.
function logGamma(x) {
  const cof = [
    76.180091729471, -86.505320329417, 24.014098240831,
    -1.231739572451, 0.001208650973867, -0.000005395239385,
  ];
  let y = x, tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) { y += 1; ser += cof[j] / y; }
  return -tmp + Math.log(2.506628274631 * ser / x);
}

function betaContinuedFraction(x, a, b) {
  const MAXIT = 200, EPS = 3e-9, FPMIN = 1e-300;
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < FPMIN) d = FPMIN;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= MAXIT; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < FPMIN) d = FPMIN;
    c = 1 + aa / c; if (Math.abs(c) < FPMIN) c = FPMIN;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}

function regularizedIncompleteBeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  return x < (a + 1) / (a + b + 2)
    ? bt * betaContinuedFraction(x, a, b) / a
    : 1 - bt * betaContinuedFraction(1 - x, b, a) / b;
}

// Inverse Beta CDF via bisection. We only ever need 5 quantile points, so
// bisection's simplicity and reliability beat a faster-but-fiddlier Newton's
// method here — this isn't running often enough for the extra speed to matter.
function betaQuantile(prob, a, b) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (regularizedIncompleteBeta(mid, a, b) < prob) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// Fixed 5-point discretization of the posterior — deterministic (no RNG
// jitter in a live UI number that re-renders every rally) and cheap enough to
// run every point: 5×5 DP evaluations instead of 1.
const WP_UNCERTAINTY_QUANTILES = [0.1, 0.3, 0.5, 0.7, 0.9];

export function computeSetWinProbUncertain(pAlpha, pBeta, qAlpha, qBeta, ourScore, oppScore, serveSide, isDecider = false) {
  const pPoints = WP_UNCERTAINTY_QUANTILES.map((lvl) => betaQuantile(lvl, pAlpha, pBeta));
  const qPoints = WP_UNCERTAINTY_QUANTILES.map((lvl) => betaQuantile(lvl, qAlpha, qBeta));
  let sum = 0;
  for (const p of pPoints) {
    for (const q of qPoints) sum += computeSetWinProb(p, q, ourScore, oppScore, serveSide, isDecider);
  }
  return sum / (pPoints.length * qPoints.length);
}

// pDeciderSet: win prob for the deciding set (target 15); pass null to use pFutureSet for all sets.
export function computeMatchWinProb(pCurrentSet, pFutureSet, ourSets, oppSets, setsToWin = 3, pDeciderSet = null) {
  const memo = new Map();

  function dp(w, l) {
    if (w >= setsToWin) return 1;
    if (l >= setsToWin) return 0;
    const key = `${w},${l}`;
    if (memo.has(key)) return memo.get(key);
    // Use deciding-set probability when both teams are one win away from the decider
    const isDecider = pDeciderSet !== null && w === setsToWin - 1 && l === setsToWin - 1;
    const pNext = isDecider ? pDeciderSet : pFutureSet;
    const val = pNext * dp(w + 1, l) + (1 - pNext) * dp(w, l + 1);
    memo.set(key, val);
    return val;
  }

  // Current set outcome leads into the future sets tree
  const winAfter  = dp(ourSets + 1, oppSets);
  const loseAfter = dp(ourSets, oppSets + 1);
  return pCurrentSet * winAfter + (1 - pCurrentSet) * loseAfter;
}

// ── Win-probability calibration ──────────────────────────────────────────────
// computeSetWinProbUncertain() above fixes most of the overconfidence problem
// structurally (it no longer treats a shaky estimate as certain), but a real
// season replay still showed a smaller residual gap on top of that — these
// tables are a thin empirical correction for what's left over, not a
// replacement for the uncertainty-awareness above. [rawModelOutput,
// whatActuallyHappened] pairs, measured by replaying a real season's
// rally-by-rally history point-in-time (no lookahead) through
// computeSetWinProbUncertain/computeMatchWinProb against real match/set
// outcomes. Derived from one team's 2026 season (44 matches, ~4,200 points) —
// re-derive from a fresh backup export periodically as more data accumulates
// or before relying on this for a very different-sized program.
const MATCH_WP_CALIBRATION = [
  [0,     0],
  [0.034, 0.015],
  [0.151, 0.087],
  [0.249, 0.184],
  [0.345, 0.275],
  [0.446, 0.282],
  [0.548, 0.384],
  [0.649, 0.532],
  [0.746, 0.612],
  [0.852, 0.780],
  [0.968, 0.958],
  [1,     1],
];

const SET_WP_CALIBRATION = [
  [0,     0],
  [0.034, 0.058],
  [0.150, 0.093],
  [0.253, 0.183],
  [0.349, 0.296],
  [0.449, 0.372],
  [0.552, 0.499],
  [0.648, 0.517],
  [0.749, 0.678],
  [0.848, 0.838],
  [0.971, 0.962],
  [1,     1],
];

// Piecewise-linear lookup through a sorted [rawProb, actualRate] table.
function calibrateWinProb(rawProb, table) {
  if (rawProb <= table[0][0]) return table[0][1];
  const last = table[table.length - 1];
  if (rawProb >= last[0]) return last[1];
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i - 1];
    const [x2, y2] = table[i];
    if (rawProb <= x2) {
      const t = (rawProb - x1) / (x2 - x1);
      return y1 + t * (y2 - y1);
    }
  }
  return rawProb;
}

export function calibrateMatchWinProb(rawProb) { return calibrateWinProb(rawProb, MATCH_WP_CALIBRATION); }
export function calibrateSetWinProb(rawProb)   { return calibrateWinProb(rawProb, SET_WP_CALIBRATION); }

// Per-player Win Probability Added (WPA) using a rally-by-rally Markov delta.
// For each rally: compute WP_before and WP_after using the same uncertainty-aware,
// calibrated model as the live win-probability meter (computeSetWinProbUncertain +
// calibrateSetWinProb), then attribute the delta (WP_after − WP_before) to the
// terminal-contact player. pAlpha/pBeta/qAlpha/qBeta are the Beta-shape params from
// computePQ (same blended prior/live estimate used for the live meter).
//
// Terminal contact attribution (our team only):
//   We won  → ACE (server), KILL (attacker), BS (blocker), BA (split between assisters)
//   We lost → SE (server via rally.server_player_id), AE (attacker), P0 (passer),
//              error-action (BHE/lift/net/rotation), BE (blocker)
//   Opponent error / opponent earned point → unattributed
//
// Returns { [playerId]: { wpa, wpa_pos, wpa_neg, wpa_count } }
export function computePlayerWPA(
  contacts, rallies,
  pAlpha = WP_FALLBACK_P * BAYES_K, pBeta = (1 - WP_FALLBACK_P) * BAYES_K,
  qAlpha = WP_FALLBACK_Q * BAYES_K, qBeta = (1 - WP_FALLBACK_Q) * BAYES_K,
) {
  if (!rallies?.length || !contacts?.length) return {};

  // pAlpha/pBeta/qAlpha/qBeta are fixed for this whole call, so the 5x5 quantile
  // grid (see computeSetWinProbUncertain) and its DP results are reusable across
  // every rally/set/match this function processes — the win-prob for a given
  // (p, q, score, side) never changes. Without this cache, computeSetWinProbUncertain
  // resolves the same handful of low-score states from scratch millions of times
  // over a season (measured: ~35s for one team's season vs a few ms with it).
  const pPoints = WP_UNCERTAINTY_QUANTILES.map((lvl) => betaQuantile(lvl, pAlpha, pBeta));
  const qPoints = WP_UNCERTAINTY_QUANTILES.map((lvl) => betaQuantile(lvl, qAlpha, qBeta));
  const memoGridRegular = pPoints.map(() => qPoints.map(() => new Map()));
  const memoGridDecider = pPoints.map(() => qPoints.map(() => new Map()));
  function wp(ourScore, oppScore, serveSide, isDecider) {
    const grid = isDecider ? memoGridDecider : memoGridRegular;
    let sum = 0;
    for (let i = 0; i < pPoints.length; i++) {
      for (let j = 0; j < qPoints.length; j++) {
        sum += computeSetWinProb(pPoints[i], qPoints[j], ourScore, oppScore, serveSide, isDecider, grid[i][j]);
      }
    }
    return calibrateSetWinProb(sum / (pPoints.length * qPoints.length));
  }

  // Group all contacts (incl. opponent) by set_id + rally_number
  const contactsByRally = new Map();
  for (const c of contacts) {
    const key = `${c.set_id}_${c.rally_number}`;
    if (!contactsByRally.has(key)) contactsByRally.set(key, []);
    contactsByRally.get(key).push(c);
  }

  // Group rallies by set_id, sorted by rally_number within each set
  const bySet = new Map();
  for (const r of rallies) {
    if (!bySet.has(r.set_id)) bySet.set(r.set_id, []);
    bySet.get(r.set_id).push(r);
  }
  for (const arr of bySet.values()) arr.sort((a, b) => a.rally_number - b.rally_number);

  const acc = {};
  const ensure = (pid) => { acc[pid] ??= { wpa: 0, wpa_pos: 0, wpa_neg: 0, wpa_count: 0 }; return acc[pid]; };

  for (const setRallies of bySet.values()) {
    if (!setRallies.length) continue;
    // Detect deciding set by total points: deciding sets end ~15, regular sets end ~25
    const ourPts = setRallies.filter(r => r.point_winner === 'us').length;
    const oppPts = setRallies.filter(r => r.point_winner === 'them').length;
    const isDecider = Math.max(ourPts, oppPts) < 25;
    const target = isDecider ? 15 : 25;

    let ourScore = 0, oppScore = 0;

    for (let i = 0; i < setRallies.length; i++) {
      const rally = setRallies[i];
      const next  = setRallies[i + 1];

      const wpBefore = wp(ourScore, oppScore, rally.serve_side, isDecider);

      if (rally.point_winner === 'us') ourScore++; else oppScore++;

      const setEnded = (ourScore >= target && ourScore >= oppScore + 2) ||
                       (oppScore >= target && oppScore >= ourScore + 2);
      let wpAfter;
      if (setEnded || !next) {
        wpAfter = rally.point_winner === 'us' ? 1 : 0;
      } else {
        wpAfter = wp(ourScore, oppScore, next.serve_side, isDecider);
      }

      const delta = wpAfter - wpBefore;
      const key   = `${rally.set_id}_${rally.rally_number}`;
      const ours  = (contactsByRally.get(key) ?? []).filter(c => !c.opponent_contact);

      const attributions = [];
      if (rally.point_winner === 'us') {
        const ace   = ours.find(c => c.action === 'serve'  && c.result === 'ace');
        const kill  = ours.find(c => c.action === 'attack' && c.result === 'kill');
        const bSolo = ours.find(c => c.action === 'block'  && c.result === 'solo');
        const bAsst = ours.filter(c => c.action === 'block' && c.result === 'assist');
        if (ace?.player_id)        attributions.push({ pid: String(ace.player_id),  w: 1 });
        else if (kill?.player_id)  attributions.push({ pid: String(kill.player_id), w: 1 });
        else if (bSolo?.player_id) attributions.push({ pid: String(bSolo.player_id), w: 1 });
        else if (bAsst.length > 0) {
          for (const ba of bAsst) if (ba.player_id) attributions.push({ pid: String(ba.player_id), w: 1 / bAsst.length });
        }
      } else {
        const se  = ours.find(c => c.action === 'serve'  && c.result === 'error');
        const ae  = ours.find(c => c.action === 'attack' && c.result === 'error');
        const p0  = ours.find(c => c.action === 'pass'   && c.result === '0');
        const err = ours.find(c => c.action === 'error');
        const be  = ours.find(c => c.action === 'block'  && c.result === 'error');
        if (se) {
          const pid = rally.server_player_id ? String(rally.server_player_id) : se.player_id ? String(se.player_id) : null;
          if (pid) attributions.push({ pid, w: 1 });
        } else if (ae?.player_id)  attributions.push({ pid: String(ae.player_id),  w: 1 });
        else if (p0?.player_id)    attributions.push({ pid: String(p0.player_id),  w: 1 });
        else if (err?.player_id)   attributions.push({ pid: String(err.player_id), w: 1 });
        else if (be?.player_id)    attributions.push({ pid: String(be.player_id),  w: 1 });
      }

      for (const { pid, w } of attributions) {
        const slot = ensure(pid);
        const contrib = delta * w;
        slot.wpa += contrib;
        slot.wpa_count++;
        if (contrib > 0) slot.wpa_pos += contrib; else slot.wpa_neg += contrib;
      }
    }
  }

  return acc;
}

/**
 * Timeout effectiveness — how many of the next 3 rallies did we win after each timeout?
 * timeouts: array of { set_id, rally_number, our_score, opp_score, side }
 * rallies:  array of { set_id, rally_number, point_winner }
 * Returns { us: { count, win3, total3, win_pct }, them: { count, win3, total3, win_pct } }
 */
export function computeTimeoutEffectiveness(timeouts, rallies) {
  // Index rallies by set_id → sorted array for fast range lookup
  const bySet = {};
  for (const r of rallies) {
    (bySet[r.set_id] ??= []).push(r);
  }
  for (const arr of Object.values(bySet)) {
    arr.sort((a, b) => a.rally_number - b.rally_number);
  }

  const result = {
    us:   { count: 0, win3: 0, total3: 0 },
    them: { count: 0, win3: 0, total3: 0 },
  };

  for (const to of timeouts) {
    const side = to.side === 'us' ? 'us' : 'them';
    result[side].count++;
    const setRallies = bySet[to.set_id] ?? [];
    // Find the 3 rallies immediately after this timeout
    const after = setRallies
      .filter(r => r.rally_number > to.rally_number)
      .slice(0, 3);
    for (const r of after) {
      result[side].total3++;
      if (r.point_winner === 'us') result[side].win3++;
    }
  }

  const pct = (s) => s.total3 > 0 ? s.win3 / s.total3 : null;
  return {
    us:   { ...result.us,   win_pct: pct(result.us)   },
    them: { ...result.them, win_pct: pct(result.them) },
  };
}

/**
 * Splits a season's stats into win-game and loss-game buckets to show
 * which metrics correlate with winning for this specific team.
 * Returns null when < 2 wins or < 2 losses exist (insufficient sample).
 */
export async function computeWinCorrelation(seasonId) {
  const [winStats, lossStats] = await Promise.all([
    computeSeasonStats(seasonId, { result: 'win' }),
    computeSeasonStats(seasonId, { result: 'loss' }),
  ]);
  if (!winStats || !lossStats || winStats.empty || lossStats.empty) return null;
  if ((winStats.matchCount ?? 0) < 2 || (lossStats.matchCount ?? 0) < 2) return null;
  return {
    win:  { team: winStats.team,  rotation: winStats.rotation,  isOos: winStats.isOos,  pointQuality: winStats.pointQuality,  matches: winStats.matchCount  },
    loss: { team: lossStats.team, rotation: lossStats.rotation, isOos: lossStats.isOos, pointQuality: lossStats.pointQuality, matches: lossStats.matchCount },
  };
}

export function pickMetricVal(src, key, d) {
  if (src === 'rotation')     return d?.rotation?.[key];
  if (src === 'isOos_is')     return d?.isOos?.total?.is?.[key];
  if (src === 'pointQuality') return d?.pointQuality?.[key];
  return d?.team?.[key];
}

export function computeRallyHistogram(contacts) {
  if (!contacts?.length) return [];
  const lenByRally = new Map();
  for (const c of contacts) {
    if (c.rally_number == null) continue;
    // Key on set_id+rally_number so rally counts don't bleed across sets
    const key = `${c.set_id}_${c.rally_number}`;
    lenByRally.set(key, (lenByRally.get(key) ?? 0) + 1);
  }
  const counts = RALLY_BUCKETS.map(b => ({ name: b.label, rallies: 0 }));
  for (const len of lenByRally.values()) {
    const idx = RALLY_BUCKETS.findIndex(b => len >= b.min && len <= b.max);
    if (idx >= 0) counts[idx].rallies++;
  }
  const total = counts.reduce((s, c) => s + c.rallies, 0);
  return counts.map(c => ({ ...c, pct: total ? Math.round(c.rallies / total * 100) : 0 }));
}
