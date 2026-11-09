import { db } from '../db/schema';
import { MATCH_STATUS, SET_STATUS } from '../constants';
import { sortByDateTime } from './seasonSummary';

export function fmtVal(val, decimals = 0) {
  if (val == null || isNaN(val)) return '—';
  return decimals > 0 ? Number(val).toFixed(decimals) : String(Math.round(val));
}

export function fmtPct(val) {
  if (val == null || isNaN(val)) return '—';
  return (val * 100).toFixed(1) + '%';
}

export function fmtHit(val) {
  if (val == null || isNaN(val)) return '—';
  const s = (val * 1000).toFixed(0);
  return (val >= 0 ? '' : '') + (val * 1000 >= 0 ? '.' : '-.') + Math.abs(Number(s)).toString().padStart(3, '0');
}

// Checked in this order so "Super-Sectional" isn't mistaken for "Sectional".
const PLAYOFF_STAGES = [
  [/(3rd|third) place/, 4.5], // after the state semifinals, before the state final
  [/super ?sectional/, 2],
  [/sectional/, 1],
  [/regional/, 0],
  [/quarter ?final/, 3],
  [/semi ?final/, 4],
  [/state/, 5],
  [/first round/, -2],
  [/second round/, -1],
];
const UNKNOWN_ROUND_RANK = 999; // custom names sort last, as they always have
const BLANK_ROUND_RANK = -999;  // rows with an opponent but no round name go first

const normalizeRound = (name) => (name ?? '').trim().toLowerCase()
  .replace(/[\s-]+/g, ' ')
  .replace(/\bsection\b/g, 'sectional');

// Higher = later in the playoffs. Within a stage, "Regional Semifinal" comes
// before "Regional Final".
function roundRank(roundName) {
  const name = normalizeRound(roundName);
  if (!name) return BLANK_ROUND_RANK;
  const stage = PLAYOFF_STAGES.find(([pattern]) => pattern.test(name));
  if (!stage) return UNKNOWN_ROUND_RANK;
  const step = /quarter ?final/.test(name) ? 0 : /semi ?final/.test(name) ? 1 : 2;
  return stage[1] * 10 + step;
}

// "SECTIONAL SEMIFINAL" → "Sectional Semifinal", "super-sectional" → "Super-Sectional".
function formatRoundName(name) {
  return (name ?? '').trim().toLowerCase()
    .replace(/(^|[\s-])(\p{L})/gu, (_, gap, letter) => gap + letter.toUpperCase())
    .replace(/\bIhsa\b/g, 'IHSA');
}

export const MAX_PLAYOFF_SETS = 5;

// Turns what was typed into a round's score boxes into saved numbers. Fully blank
// sets drop out. `incompleteSet` is the first set (1-based) with only one score.
export function readSetScores(sets) {
  const scores = [];
  let incompleteSet = null;
  (sets ?? []).forEach((set, i) => {
    const us = String(set?.us ?? '').trim();
    const opp = String(set?.opp ?? '').trim();
    if (!us && !opp) return;
    if (!us || !opp) { incompleteSet ??= i + 1; return; }
    scores.push({ us: Number(us), opp: Number(opp) });
  });
  return { scores, incompleteSet };
}

// Final score of each finished set, in set order: [{ us, opp }].
export function gameSetScores(sets) {
  return (sets ?? [])
    .filter(s => s.status === SET_STATUS.COMPLETE && s.our_score != null && s.opp_score != null)
    .sort((a, b) => (a.set_number ?? 0) - (b.set_number ?? 0))
    .map(s => ({ us: s.our_score, opp: s.opp_score }));
}

// Adds `set_scores` to each completed playoff game so History can show them.
export async function withPlayoffSetScores(matches) {
  const games = completedPlayoffGames(matches);
  if (!games.length) return matches ?? [];
  const sets = await db.sets.where('match_id').anyOf(games.map(m => m.id)).toArray();
  const byMatch = {};
  for (const s of sets) (byMatch[s.match_id] ??= []).push(s);
  return matches.map(m => (byMatch[m.id] ? { ...m, set_scores: gameSetScores(byMatch[m.id]) } : m));
}

function completedPlayoffGames(matches) {
  return (matches ?? []).filter(
    m => m.status === MATCH_STATUS.COMPLETE && m.match_type === 'ihsa-playoffs' && m.playoff_round?.trim()
  );
}

// Every playoff round for a season, final round first. Saved rows are combined
// with completed games: a game updates the row for its round, or adds a row if
// that game was never copied into the list. Games are ordered by date and time;
// rows with no date can only be placed by round name.
// Pairs saved rounds with completed games: exact round + opponent first, then
// round name alone, then opponent alone (a renamed round — a team can't meet the
// same opponent twice in one bracket). Saved rows left over that share an
// opponent with a game are stale copies of it.
function matchPlayoffRounds(rounds, matches) {
  const rows = rounds ?? [];
  const unmatched = new Set(rows.keys());
  const claims = []; // [game, row index or null]
  const sameRound = (r, m) => normalizeRound(r.round) === normalizeRound(m.playoff_round);
  const sameOpponent = (r, m) => !!normalizeRound(m.opponent_name) && normalizeRound(r.opponent) === normalizeRound(m.opponent_name);
  let remaining = completedPlayoffGames(matches);
  for (const isMatch of [(r, m) => sameRound(r, m) && sameOpponent(r, m), sameRound, sameOpponent]) {
    remaining = remaining.filter(m => {
      const i = [...unmatched].find(j => isMatch(rows[j], m));
      if (i === undefined) return true;
      unmatched.delete(i);
      claims.push([m, i]);
      return false;
    });
  }
  for (const m of remaining) claims.push([m, null]);
  const games = completedPlayoffGames(matches);
  const stale = new Set([...unmatched].filter(i => games.some(m => sameOpponent(rows[i], m))));
  return { claims, stale };
}

// Saved rounds with any stale copies of tracked games removed, or null when
// nothing needs to change. Used to clean up duplicates saved by older versions.
export function prunedPlayoffRounds(rounds, matches) {
  const { stale } = matchPlayoffRounds(rounds, matches);
  if (!stale.size) return null;
  return rounds.filter((_, i) => !stale.has(i));
}

export function seasonPlayoffRounds(rounds, matches) {
  const rows = (rounds ?? []).map(r => ({ ...r }));
  const { claims, stale } = matchPlayoffRounds(rows, matches);

  const applyGame = (m, i) => {
    rows[i] = {
      ...rows[i],
      round:      m.playoff_round,
      opponent:   m.opponent_name || rows[i].opponent,
      opp_seed:   m.opponent_playoff_seed != null ? String(m.opponent_playoff_seed) : rows[i].opp_seed,
      result:     (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0) ? 'W' : 'L',
      score:      `${m.our_sets_won ?? 0}-${m.opp_sets_won ?? 0}`,
      date:       m.date,
      match_time: m.match_time,
      // A tracked game's set scores replace any typed ones, so they always
      // agree with the set count above.
      ...(m.set_scores?.length ? { set_scores: m.set_scores } : {}),
    };
  };

  for (const [m, i] of claims) {
    if (i != null) { applyGame(m, i); continue; }
    rows.push({});
    applyGame(m, rows.length - 1);
  }

  return rows
    .filter((_, i) => !stale.has(i))
    .sort((a, b) =>
      (a.date && b.date ? sortByDateTime(a, b) : 0) || roundRank(a.round) - roundRank(b.round)
    )
    .reverse()
    .map(r => (r.round?.trim() ? { ...r, round: formatRoundName(r.round) } : r));
}

const RESULT_PREFIX = { W: 'Won', L: 'Loss' };
const STATE_FINAL_ROUND = /^(ihsa )?state (championship|champs?|finals?)( game| match)?$/;
const STATE_CHAMPIONS = 'State Champions';

// The finish implied by the top of the round list, so the two always agree.
export function inferSeasonFinish(rounds, matches) {
  const last = seasonPlayoffRounds(rounds, matches).find(r => r.round?.trim());
  if (!last) return '';
  if (last.result === 'W' && STATE_FINAL_ROUND.test(normalizeRound(last.round))) return STATE_CHAMPIONS;
  const prefix = RESULT_PREFIX[last.result];
  return prefix ? `${prefix} ${last.round}` : last.round;
}

// True only for a bare round name like "Sectional" or "Regional Semi Final".
// "Regional Champions", "State Championship" and "Round 1" don't count.
const PLAIN_ROUND_NAME = /^(ihsa )?((regional|sectional|super ?sectional|state)s? ?)?((quarter ?|semi ?)?finals?)?$/;

function isPlainRoundName(finish) {
  const name = normalizeRound(finish);
  return !!name && PLAIN_ROUND_NAME.test(name) && roundRank(name) !== UNKNOWN_ROUND_RANK;
}

// True when a saved finish is something the app filled in — a round name, or
// anything starting "Won"/"Loss" — not custom wording like "State Runner-Up".
function isAutoFinish(stored, rounds, matches) {
  const name = normalizeRound(stored);
  if (/^(won|loss) /.test(name) || name === 'state championship' || isPlainRoundName(name)) return true;
  if (name === STATE_CHAMPIONS.toLowerCase()) return true; // so correcting the final's result updates it
  return seasonPlayoffRounds(rounds, matches).some(r => normalizeRound(r.round) === name);
}

// The finish to show: custom wording is kept; otherwise the games decide. A bare
// round name with no known result reads as a loss: a season ends on one unless
// it's won outright, and the old code only saved a bare name after a loss.
// "State" and "State Final" stay bare: those teams may have finished 1st or 3rd.
const STATE_LEVEL_NAME = /^(ihsa )?states?( finals?)?$/;

export function resolveSeasonFinish(stored, rounds, matches) {
  const saved = (stored ?? '').trim();
  const finish = saved && !isAutoFinish(saved, rounds, matches)
    ? saved
    : inferSeasonFinish(rounds, matches) || saved;
  const assumeLoss = isPlainRoundName(finish) && !STATE_LEVEL_NAME.test(normalizeRound(finish));
  return assumeLoss ? `Loss ${formatRoundName(finish)}` : finish;
}

// A season's all-time place on a Records top-10 list, or null if it isn't on it.
// Ties share a place, so two seasons with the same best total are both #1.
export function allTimeRank(rows, isThisSeason) {
  const row = (rows ?? []).find(r => !r.historical && isThisSeason(r));
  if (!row) return null;
  return 1 + rows.filter(r => r.val > row.val).length;
}

// Called when a season is ended: remembers who was on the roster at that moment
// (by player `uid`, which is the same on every synced device), so the finished
// season can always show its roster even after players are archived.
// Won't overwrite a snapshot that already exists (e.g. ended twice).
export async function snapshotSeasonRoster(seasonId, teamId) {
  const season = await db.seasons.get(seasonId);
  if (!season || Array.isArray(season.roster_uids)) return;
  const players = await db.players.where('team_id').equals(teamId)
    .filter(p => p.is_active !== false).toArray();
  await db.seasons.update(seasonId, {
    roster_uids: players.map(p => p.uid).filter(Boolean),
  });
}

// Called immediately when a season is ended. Saves the finish implied by the
// season's games, replacing any earlier auto-filled value but not custom wording.
export async function applyInferredSeasonFinish(seasonId, teamId, year) {
  const matches = await db.matches.where('season_id').equals(seasonId).toArray();

  const existing = await db.season_history
    .where('team_id').equals(teamId)
    .filter(h => String(h.year) === String(year))
    .first();

  const finish = resolveSeasonFinish(existing?.state_finish, existing?.playoff_rounds, matches);
  if (!finish) return;

  if (existing) {
    if (finish !== existing.state_finish) {
      await db.season_history.update(existing.id, { state_finish: finish });
    }
  } else {
    await db.season_history.add({ team_id: teamId, year, state_finish: finish });
  }
}

// ── Our playoff seed ─────────────────────────────────────────────────────────
// A team has one seed for the whole playoffs, so it's stored once — on the
// season's History entry (season_history.playoff_seed) — and every playoff game
// screen reads and writes that same value.

// The number in a saved seed ("#2" → "2"); '' when there isn't one.
export function seedDigits(val) {
  const m = String(val ?? '').match(/\d+/);
  return m ? String(Number(m[0])) : '';
}

async function historyEntryForSeason(seasonId) {
  const season = seasonId != null ? await db.seasons.get(seasonId) : null;
  if (!season) return { season: null, entry: null };
  const entry = await db.season_history
    .where('team_id').equals(season.team_id)
    .filter(h => String(h.year) === String(season.year))
    .first();
  return { season, entry: entry ?? null };
}

export async function getOurSeed(seasonId) {
  const { entry } = await historyEntryForSeason(seasonId);
  return seedDigits(entry?.playoff_seed);
}

// Saves our seed for the season. A blank box never erases a saved seed.
export async function saveOurSeed(seasonId, seed) {
  const digits = seedDigits(seed);
  if (!digits) return;
  const { season, entry } = await historyEntryForSeason(seasonId);
  if (!season) return;
  if (entry) {
    if (seedDigits(entry.playoff_seed) !== digits) {
      await db.season_history.update(entry.id, { playoff_seed: digits });
    }
  } else {
    await db.season_history.add({ team_id: season.team_id, year: season.year, playoff_seed: digits });
  }
}

// ── Playoff titles from games ────────────────────────────────────────────────
// Titles are only given for winning a Regional final, Sectional final or the
// Super-Sectional, plus State placements (champion, runner-up, 3rd, 4th).
// A bare stage name ("Regional") doesn't count: it may not be the final.
const STAGE_FINAL = /\b(final|finals|championship|champs?)\b/;
const NOT_FINAL = /\b(semi ?finals?|quarter ?finals?)\b/;

// The title (or null) a finished playoff game earns.
export function titleForGame(roundName, won) {
  const n = normalizeRound(roundName);
  if (!n) return null;
  if (/(3rd|third) place/.test(n)) return won ? 'State 3rd Place' : 'State 4th Place';
  if (STATE_FINAL_ROUND.test(n)) return won ? 'State Champions' : 'State Runner-Up';
  if (!won || NOT_FINAL.test(n)) return null;
  if (/super ?sectional/.test(n)) return 'Super-Sectional Champions';
  if (/sectional/.test(n) && STAGE_FINAL.test(n)) return 'Sectional Champions';
  if (/regional/.test(n) && STAGE_FINAL.test(n)) return 'Regional Champions';
  return null;
}

// Which automatic title a typed one means, so the same title isn't shown twice
// ("Regional Champs" typed + "Regional Champions" from the games).
function sameAsAutoTitle(typed) {
  const t = normalizeRound(typed);
  if (/state/.test(t)) {
    if (/(3rd|third)/.test(t)) return 'State 3rd Place';
    if (/(4th|fourth)/.test(t)) return 'State 4th Place';
    if (/(runner|2nd|second)/.test(t)) return 'State Runner-Up';
    if (/champ/.test(t)) return 'State Champions';
  }
  if (!/champ/.test(t)) return null;
  if (/super ?sectional/.test(t)) return 'Super-Sectional Champions';
  if (/sectional/.test(t)) return 'Sectional Champions';
  if (/regional/.test(t)) return 'Regional Champions';
  return null;
}

// A season's titles: the ones typed in, plus any earned in tracked playoff games.
export function seasonTitles(typedTitles, matches) {
  const typed = (Array.isArray(typedTitles) ? typedTitles : typedTitles ? [typedTitles] : [])
    .map(t => String(t).trim()).filter(Boolean);
  const have = new Set(typed.map(sameAsAutoTitle).filter(Boolean));
  const auto = [];
  for (const m of completedPlayoffGames(matches)) {
    const title = titleForGame(m.playoff_round, (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0));
    if (title && !have.has(title)) { have.add(title); auto.push(title); }
  }
  return [...typed, ...auto];
}
