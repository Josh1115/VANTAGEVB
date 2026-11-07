import { db } from '../db/schema';
import { MATCH_STATUS } from '../constants';
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

function completedPlayoffGames(matches) {
  return (matches ?? []).filter(
    m => m.status === MATCH_STATUS.COMPLETE && m.match_type === 'ihsa-playoffs' && m.playoff_round?.trim()
  );
}

// Every playoff round for a season, final round first. Saved rows are combined
// with completed games: a game updates the row for its round, or adds a row if
// that game was never copied into the list. Games are ordered by date and time;
// rows with no date can only be placed by round name.
export function seasonPlayoffRounds(rounds, matches) {
  const rows = (rounds ?? []).map(r => ({ ...r }));
  const unmatched = new Set(rows.keys());
  const sameRound = (r, m) => normalizeRound(r.round) === normalizeRound(m.playoff_round);
  const sameOpponent = (r, m) => normalizeRound(r.opponent) === normalizeRound(m.opponent_name);

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
    };
    unmatched.delete(i);
  };

  // Exact round + opponent first, so a game can't take a row that belongs to another.
  let remaining = completedPlayoffGames(matches);
  for (const isMatch of [(r, m) => sameRound(r, m) && sameOpponent(r, m), sameRound]) {
    remaining = remaining.filter(m => {
      const i = [...unmatched].find(j => isMatch(rows[j], m));
      if (i === undefined) return true;
      applyGame(m, i);
      return false;
    });
  }
  for (const m of remaining) {
    rows.push({});
    applyGame(m, rows.length - 1);
  }

  return rows
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
