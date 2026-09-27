import { db } from '../db/schema';
import { addTombstone, tombstoneKeyForMatch } from './merge';

// Looks up an opponent by exact name, creating it if it doesn't exist yet.
// Shared by every "edit a match's opponent" flow (dashboard schedule editor,
// match summary editor) so renaming an opponent always keeps opponent_id
// pointing at the right row instead of drifting from the displayed name.
export async function findOrCreateOpponent(name) {
  const trimmed = name.trim();
  const existing = await db.opponents.where('name').equals(trimmed).first();
  if (existing) return existing;
  const id = await db.opponents.add({ name: trimmed });
  return { id, name: trimmed };
}

// ── Single-match queries ────────────────────────────────────────────────────

export const getContactsForMatch = (matchId) =>
  db.contacts.where('match_id').equals(matchId).toArray();

// Count of sets used as denominator in per-set stats (KPS, DiPS, etc.)
// Counts complete sets + 1 if a set is currently in progress.
export const getSetsPlayedCount = async (matchId) => {
  const sets = await db.sets.where('match_id').equals(matchId).toArray();
  const complete   = sets.filter(s => s.status === 'complete').length;
  const inProgress = sets.some(s => s.status === 'in_progress');
  return Math.max(1, complete + (inProgress ? 1 : 0));
};

// Batched version — single query for multiple matches, returns { [matchId]: count }
export const getBatchSetsPlayedCount = async (matchIds) => {
  if (!matchIds.length) return {};
  const sets = await db.sets.where('match_id').anyOf(matchIds).toArray();
  const counts = Object.fromEntries(matchIds.map(id => [id, 0]));
  let inProgress = {};
  for (const s of sets) {
    if (s.status === 'complete')     counts[s.match_id] = (counts[s.match_id] ?? 0) + 1;
    if (s.status === 'in_progress')  inProgress[s.match_id] = true;
  }
  for (const id of matchIds) {
    if (inProgress[id]) counts[id] = (counts[id] ?? 0) + 1;
    if (!counts[id]) counts[id] = 1;
  }
  return counts;
};

// Rallies for a match — requires two hops (match → sets → rallies)
export const getRalliesForMatch = async (matchId) => {
  const sets   = await db.sets.where('match_id').equals(matchId).toArray();
  const setIds = sets.map(s => s.id);
  return setIds.length
    ? db.rallies.where('set_id').anyOf(setIds).toArray()
    : [];
};

// ── Multi-match queries (season / report view) ──────────────────────────────

export const getContactsForMatches = (matchIds) =>
  matchIds.length
    ? db.contacts.where('match_id').anyOf(matchIds).toArray()
    : Promise.resolve([]);

export const getMatchesForSeason = (seasonId) =>
  db.matches.where('season_id').equals(seasonId).toArray();

// Sum of opp_score across all complete sets for the given matches
export const getOppScoredForMatches = async (matchIds) => {
  if (!matchIds.length) return 0;
  const sets = await db.sets.where('match_id').anyOf(matchIds).toArray();
  return sets
    .filter(s => s.status === 'complete')
    .reduce((sum, s) => sum + (s.opp_score ?? 0), 0);
};

// Sum of our_score across all complete sets for the given matches
export const getOurScoredForMatches = async (matchIds) => {
  if (!matchIds.length) return 0;
  const sets = await db.sets.where('match_id').anyOf(matchIds).toArray();
  return sets
    .filter(s => s.status === 'complete')
    .reduce((sum, s) => sum + (s.our_score ?? 0), 0);
};

// Timeouts for multiple matches
export const getTimeoutsForMatches = async (matchIds) => {
  if (!matchIds.length) return [];
  return db.timeouts.where('match_id').anyOf(matchIds).toArray();
};

// Rallies for multiple matches — used by season-level stats
export const getRalliesForMatches = async (matchIds) => {
  if (!matchIds.length) return [];
  const sets = await db.sets.where('match_id').anyOf(matchIds).toArray();
  const setIds = sets.map(s => s.id);
  return setIds.length
    ? db.rallies.where('set_id').anyOf(setIds).toArray()
    : [];
};

// Same as getRalliesForMatches but each rally is annotated with match_id for per-match grouping
export const getRalliesForMatchesWithMatchId = async (matchIds) => {
  if (!matchIds.length) return [];
  const sets = await db.sets.where('match_id').anyOf(matchIds).toArray();
  const setToMatch = Object.fromEntries(sets.map(s => [s.id, s.match_id]));
  const setIds = sets.map(s => s.id);
  if (!setIds.length) return [];
  const rallies = await db.rallies.where('set_id').anyOf(setIds).toArray();
  return rallies.map(r => ({ ...r, match_id: setToMatch[r.set_id] }));
};

// Returns { [player_id]: modal_position_label } derived from actual lineup and substitution records.
// Lineup records (starters) take precedence; substitution in_position_label fills the gap for sub players.
// Uses the most frequently-played position when a player appears at multiple positions.
export const getPlayerPositionsForMatches = async (matchIds) => {
  if (!matchIds.length) return {};
  const sets = await db.sets.where('match_id').anyOf(matchIds).toArray();
  const setIds = sets.map(s => s.id);
  if (!setIds.length) return {};

  const [lineupRows, subRows] = await Promise.all([
    db.lineups.where('set_id').anyOf(setIds).toArray(),
    db.substitutions.where('set_id').anyOf(setIds).toArray(),
  ]);

  const tally = {};

  // Starters — from lineup records
  for (const row of lineupRows) {
    if (!row.player_id || !row.position_label) continue;
    (tally[row.player_id] ??= {})[row.position_label] =
      ((tally[row.player_id][row.position_label] ?? 0) + 1);
  }

  // Sub players — only use substitution position if player has no lineup record at all
  const lineupPlayerIds = new Set(lineupRows.map(r => r.player_id));
  for (const row of subRows) {
    if (!row.player_in || !row.in_position_label) continue;
    if (lineupPlayerIds.has(row.player_in)) continue; // lineup record wins
    (tally[row.player_in] ??= {})[row.in_position_label] =
      ((tally[row.player_in][row.in_position_label] ?? 0) + 1);
  }

  return Object.fromEntries(
    Object.entries(tally).map(([pid, counts]) => [
      pid,
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0],
    ])
  );
};

// Deletes a match row and every dependent record (sets, contacts, rallies,
// lineups, substitutions) WITHOUT recording a delete-marker (tombstone) and
// without the orphaned-opponent cleanup. Use this whenever a tombstone already
// exists or must not be created — the sync-time tombstone-enforcement pass
// (backup.js) and the duplicate-merge tool (dedupe.js). `deleteMatch` wraps this
// and adds the tombstone + opponent cleanup for a real user-initiated delete.
export async function cascadeDeleteMatchRow(matchId) {
  const sets   = await db.sets.where('match_id').equals(matchId).toArray();
  const setIds = sets.map((s) => s.id);
  await Promise.all([
    db.contacts.where('match_id').equals(matchId).delete(),
    db.rallies.where('set_id').anyOf(setIds).delete(),
    db.lineups.where('set_id').anyOf(setIds).delete(),
    db.substitutions.where('set_id').anyOf(setIds).delete(),
  ]);
  await db.sets.where('match_id').equals(matchId).delete();
  await db.matches.delete(matchId);
}

// Cascade-delete a match and all dependent records, recording a tombstone so the
// deletion propagates across devices on the next cloud sync.
// If the match had an opponent_id and this was their only match, the opponent
// record (and their tendencies) are also deleted to avoid orphaned profiles.
export async function deleteMatch(matchId) {
  const match  = await db.matches.get(matchId);

  // Resolve the natural-key path before the row is gone, so cloud sync knows
  // never to bring this specific match back from an older cloud backup.
  const season = match ? await db.seasons.get(match.season_id) : null;
  const team   = season ? await db.teams.get(season.team_id) : null;
  const org    = team ? await db.organizations.get(team.org_id) : null;

  await cascadeDeleteMatchRow(matchId);

  if (match && season && team && org) {
    await addTombstone('match', tombstoneKeyForMatch(org.name, team, season.year, match));
  }

  // Clean up orphaned opponent created solely for this match
  if (match?.opponent_id) {
    const remaining = await db.matches.where('opponent_id').equals(match.opponent_id).count();
    if (remaining === 0) {
      await db.opp_tendencies.where('opp_id').equals(match.opponent_id).delete();
      await db.opponents.delete(match.opponent_id);
    }
  }
}
