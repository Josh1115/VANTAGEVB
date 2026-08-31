import { db } from '../db/schema';
import { cascadeDeleteMatchRow } from './queries';
import { clearMatchTombstone } from './merge';
import { MATCH_DUPE_REVIEW_WINDOW_HOURS } from '../constants';

// One-time cleanup for duplicates created by the bug fixed in stats/merge.js
// (sync used to recognize a player/opponent by name + jersey number / name alone,
// so editing either after the fact made sync think it was a new record instead
// of an edit, and duplicated it). This does NOT run automatically — it's exposed
// as a manual tool (see components/settings/DedupeModal.jsx) so nothing merges
// without a coach reviewing it first.

function norm(s) { return (s ?? '').trim().toLowerCase(); }

// ── Players ──────────────────────────────────────────────────────────────────
// Grouped by team + name only (ignoring jersey number) — exactly the pair that
// splits apart when a jersey number is added after the roster was first saved.

export async function findDuplicatePlayerGroups() {
  const players = await db.players.toArray();
  const groups = new Map();
  for (const p of players) {
    const key = `${p.team_id}|${norm(p.name)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  return [...groups.values()].filter(g => g.length > 1);
}

// Best default pick for "which copy do we keep": prefer the one with a jersey
// number set, then whichever was edited most recently.
export function pickDefaultPlayerWinner(group) {
  return [...group].sort((a, b) => {
    const aHasNum = a.jersey_number != null && a.jersey_number !== '' ? 1 : 0;
    const bHasNum = b.jersey_number != null && b.jersey_number !== '' ? 1 : 0;
    if (aHasNum !== bHasNum) return bHasNum - aHasNum;
    return (b.updated_at ?? '').localeCompare(a.updated_at ?? '');
  })[0];
}

// Folds every stat/lineup/substitution reference pointing at the losing rows
// onto the winner, then deletes the losing rows. Safe to call with a group
// where every id is real — nothing here guesses, the winner is chosen by the
// caller (UI defaults it via pickDefaultPlayerWinner, but the coach can override).
export async function mergePlayerGroup(group, winnerId) {
  const loserIds = group.map(p => p.id).filter(id => id !== winnerId);
  if (!loserIds.length) return;

  await db.transaction('rw', [db.players, db.lineups, db.contacts, db.substitutions, db.saved_lineups], async () => {
    await db.lineups.where('player_id').anyOf(loserIds).modify({ player_id: winnerId });
    await db.contacts.where('player_id').anyOf(loserIds).modify({ player_id: winnerId });
    await db.substitutions.where('player_in_id').anyOf(loserIds).modify({ player_in_id: winnerId });
    await db.substitutions.where('player_out_id').anyOf(loserIds).modify({ player_out_id: winnerId });

    // saved_lineups stores player ids inline (serve order array + libero slots),
    // not as an indexed column, so it needs a manual scan-and-fix.
    const loserSet = new Set(loserIds);
    const savedLineups = await db.saved_lineups.toArray();
    for (const sl of savedLineups) {
      let changed = false;
      const serveOrder = (sl.serve_order ?? []).map(id => {
        if (loserSet.has(Number(id))) { changed = true; return winnerId; }
        return id;
      });
      let libero  = sl.libero_player_id;
      let libero2 = sl.libero2_player_id;
      if (loserSet.has(Number(libero)))  { libero  = winnerId; changed = true; }
      if (loserSet.has(Number(libero2))) { libero2 = winnerId; changed = true; }
      if (changed) {
        await db.saved_lineups.update(sl.id, { serve_order: serveOrder, libero_player_id: libero, libero2_player_id: libero2 });
      }
    }

    await db.players.bulkDelete(loserIds);
  });
}

// ── Opponents ────────────────────────────────────────────────────────────────
// Grouped by exact name — the opponents table's own name field rarely gets
// edited directly (see pages/OpponentDetailPage.jsx), so duplicates here are
// usually leftovers from an earlier sync race rather than a rename.

export async function findDuplicateOpponentGroups() {
  const opponents = await db.opponents.toArray();
  const groups = new Map();
  for (const o of opponents) {
    const key = norm(o.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  }
  return [...groups.values()].filter(g => g.length > 1);
}

export function pickDefaultOpponentWinner(group) {
  return [...group].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))[0];
}

export async function mergeOpponentGroup(group, winnerId) {
  const loserIds = group.map(o => o.id).filter(id => id !== winnerId);
  if (!loserIds.length) return;
  await db.transaction('rw', [db.opponents, db.matches, db.opp_tendencies], async () => {
    await db.matches.where('opponent_id').anyOf(loserIds).modify({ opponent_id: winnerId });
    await db.opp_tendencies.where('opp_id').anyOf(loserIds).modify({ opp_id: winnerId });
    await db.opponents.bulkDelete(loserIds);
  });
}

// ── Organizations ────────────────────────────────────────────────────────────
// An org's only child records are its teams, so merging is shallow and safe —
// no live stats hang directly off an organization row.

export async function findDuplicateOrgGroups() {
  const orgs = await db.organizations.toArray();
  const groups = new Map();
  for (const o of orgs) {
    const key = norm(o.name);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(o);
  }
  return [...groups.values()].filter(g => g.length > 1);
}

export function pickDefaultOrgWinner(group) {
  return [...group].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))[0];
}

export async function mergeOrgGroup(group, winnerId) {
  const loserIds = group.map(o => o.id).filter(id => id !== winnerId);
  if (!loserIds.length) return;
  await db.transaction('rw', [db.organizations, db.teams], async () => {
    await db.teams.where('org_id').anyOf(loserIds).modify({ org_id: winnerId });
    await db.organizations.bulkDelete(loserIds);
  });
}

// ── Teams ────────────────────────────────────────────────────────────────────
// Grouped by org + name only (ignoring gender/level — the fields that trigger
// this exact bug for a team, the same way jersey number does for a player).
// Unlike players/opponents, a team drags a deep tree of live data behind it
// (seasons → matches → sets/rallies). Reassigning everything is safe as long
// as the two team copies don't both already have a season for the same year —
// that would mean two independent sets of live stats trying to become "the
// 2026 season" on one team, which needs a human to sort out, not a guess. Groups
// with that kind of overlap come back with `safeToMerge: false` and are shown
// for manual review instead of an auto-merge button.
const TEAM_CHILD_TABLES = [
  'seasons', 'players', 'saved_lineups', 'historical_records',
  'season_history', 'tourney_entries', 'player_commits',
  'accolade_types', 'accolade_winners', 'practice_sessions',
];

export async function findDuplicateTeamGroups() {
  const [teams, seasons] = await Promise.all([db.teams.toArray(), db.seasons.toArray()]);
  const groups = new Map();
  for (const t of teams) {
    const key = `${t.org_id}|${norm(t.name)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(t);
  }

  const out = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const yearSets = group.map(t => new Set(seasons.filter(s => s.team_id === t.id).map(s => s.year)));
    let overlap = false;
    outer:
    for (let i = 0; i < yearSets.length; i++) {
      for (let j = i + 1; j < yearSets.length; j++) {
        for (const y of yearSets[i]) {
          if (yearSets[j].has(y)) { overlap = true; break outer; }
        }
      }
    }
    out.push({ teams: group, safeToMerge: !overlap });
  }
  return out;
}

export function pickDefaultTeamWinner(group) {
  return [...group].sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))[0];
}

export async function mergeTeamGroup(group, winnerId) {
  const loserIds = group.map(t => t.id).filter(id => id !== winnerId);
  if (!loserIds.length) return;
  await db.transaction('rw', [db.teams, ...TEAM_CHILD_TABLES.map(name => db[name])], async () => {
    for (const table of TEAM_CHILD_TABLES) {
      await db[table].where('team_id').anyOf(loserIds).modify({ team_id: winnerId });
    }
    await db.teams.bulkDelete(loserIds);
  });
}

// ── Matches ──────────────────────────────────────────────────────────────────
// Matches carry live stats, so — unlike the identical-scheduled-placeholder case
// that stats/matchIdentity.js handles automatically during sync — anything that
// might involve real data is NOT merged automatically. Instead we surface likely
// duplicate *pairs* for the coach to resolve by hand: pick which one to keep, or
// mark them as genuinely different games (a "keep both" that's remembered so it
// stops nagging).
//
// A pair is flagged when both matches are in the same season, are against the
// same opponent (or one still has no opponent set — "TBD"), and their dates fall
// within MATCH_DUPE_REVIEW_WINDOW_HOURS of each other.

const DISMISSED_PAIRS_KEY = 'vbstat_dismissed_match_dupes';

// An opponent name that isn't really an opponent yet — blank, or the literal
// "TBD" coaches type into pre-scheduled tournament slots. Treated as "unnamed"
// so a leftover "TBD" slot is flagged against the real game it became.
const isBlankOpp = (o) => !o || o === 'tbd';

// Whether two matches in the same season look like the same game entered twice:
// same real opponent (or one side still unassigned), and dates within `windowMs`.
export function matchesLookLikeDuplicates(a, b, windowMs) {
  const oa = norm(a.opponent_name);
  const ob = norm(b.opponent_name);
  const sameOpponent    = oa && ob && oa === ob && !isBlankOpp(oa);
  const oneStillUnNamed = isBlankOpp(oa) || isBlankOpp(ob);
  if (!sameOpponent && !oneStillUnNamed) return false;

  const ta = Date.parse(a.date);
  const tb = Date.parse(b.date);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return false;
  return Math.abs(ta - tb) <= windowMs;
}

function loadDismissedPairs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DISMISSED_PAIRS_KEY) ?? '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

// Stable identifier for a pair — sorted permanent uids (falling back to row id
// for pre-uid rows) so a "keep both" decision sticks across reloads.
export function matchPairKey(a, b) {
  return [a.uid || `id:${a.id}`, b.uid || `id:${b.id}`].sort().join('::');
}

export function dismissMatchPair(a, b) {
  const set = loadDismissedPairs();
  set.add(matchPairKey(a, b));
  try {
    localStorage.setItem(DISMISSED_PAIRS_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage unavailable (private mode etc.) — the pair just reappears
    // next time, which is acceptable.
  }
}

function matchStatSummary(m, setCount, contactCount) {
  return {
    id:           m.id,
    uid:          m.uid ?? null,
    opponentName: m.opponent_name || 'TBD',
    date:         (m.date ?? '').slice(0, 10),
    time:         m.match_time ?? null,
    status:       m.status,
    setCount,
    contactCount,
    hasStats:     setCount > 0 || contactCount > 0,
  };
}

// Best default "keep this one": prefer the copy that actually has data, then the
// one that's further along, then the most recently edited.
const STATUS_RANK = { complete: 3, in_progress: 2, setup: 1, scheduled: 0 };
export function pickDefaultMatchSurvivor(a, b) {
  if (a.hasStats !== b.hasStats) return a.hasStats ? a : b;
  const ra = STATUS_RANK[a.status] ?? 0;
  const rb = STATUS_RANK[b.status] ?? 0;
  if (ra !== rb) return ra > rb ? a : b;
  return (a._updated_at ?? '') >= (b._updated_at ?? '') ? a : b;
}

export async function findLikelyDuplicateMatchPairs() {
  const [matches, sets, contacts, seasons, teams] = await Promise.all([
    db.matches.toArray(),
    db.sets.toArray(),
    db.contacts.toArray(),
    db.seasons.toArray(),
    db.teams.toArray(),
  ]);

  const setCount     = new Map();
  const contactCount = new Map();
  for (const s of sets)     setCount.set(s.match_id, (setCount.get(s.match_id) ?? 0) + 1);
  for (const c of contacts) contactCount.set(c.match_id, (contactCount.get(c.match_id) ?? 0) + 1);
  const seasonById = new Map(seasons.map(s => [s.id, s]));
  const teamById   = new Map(teams.map(t => [t.id, t]));

  const windowMs  = MATCH_DUPE_REVIEW_WINDOW_HOURS * 60 * 60 * 1000;
  const dismissed = loadDismissedPairs();

  const bySeason = new Map();
  for (const m of matches) {
    if (!bySeason.has(m.season_id)) bySeason.set(m.season_id, []);
    bySeason.get(m.season_id).push(m);
  }

  const pairs = [];
  for (const [seasonId, group] of bySeason) {
    const season = seasonById.get(seasonId);
    const team   = season ? teamById.get(season.team_id) : null;

    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];

        if (!matchesLookLikeDuplicates(a, b, windowMs)) continue;
        if (dismissed.has(matchPairKey(a, b))) continue;

        const infoA = { ...matchStatSummary(a, setCount.get(a.id) ?? 0, contactCount.get(a.id) ?? 0), _updated_at: a.updated_at };
        const infoB = { ...matchStatSummary(b, setCount.get(b.id) ?? 0, contactCount.get(b.id) ?? 0), _updated_at: b.updated_at };

        pairs.push({
          pairKey:      matchPairKey(a, b),
          teamName:     team?.name ?? 'Unknown team',
          seasonYear:   season?.year ?? '?',
          defaultKeep:  pickDefaultMatchSurvivor(infoA, infoB).id,
          matches:      [infoA, infoB],
        });
      }
    }
  }
  return pairs;
}

// Resolve one reviewed pair: delete the losing copy WITHOUT writing a tombstone.
// A natural-key delete-marker (season + opponent + date) can match the SURVIVING
// copy on another device — the two copies duplicated precisely because their
// keys drifted — and remove it on the next sync, which is how a dedupe merge
// could destroy the match the coach chose to keep. Worst case the loser
// reappears from an older cloud backup and the coach merges it again; no data is
// lost. Also clear any pre-existing marker sharing the survivor's key so a
// stale one from an earlier delete doesn't remove it later.
export async function resolveDuplicateMatch(loserId, survivorId) {
  const survivor = await db.matches.get(survivorId);
  await cascadeDeleteMatchRow(loserId);
  if (survivor) await clearMatchTombstone(survivor);
}
