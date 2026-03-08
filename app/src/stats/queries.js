import { db } from '../db/schema';

// ── Single-match queries ────────────────────────────────────────────────────

export const getContactsForMatch = (matchId) =>
  db.contacts.where('match_id').equals(matchId).toArray();

// Count of sets used as denominator in per-set stats (KPS, DiPS, etc.)
// Counts complete sets + 1 if a set is currently in progress.
export const getSetsPlayedCount = async (matchId) => {
  const sets = await db.sets.where('match_id').equals(matchId).toArray();
  const complete   = sets.filter(s => s.status === 'complete').length;
  const inProgress = sets.some(s => s.status === 'in_progress');
  return complete + (inProgress ? 1 : 0) || 1;
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

// Rallies for multiple matches — used by season-level stats
export const getRalliesForMatches = async (matchIds) => {
  if (!matchIds.length) return [];
  const sets = await db.sets.where('match_id').anyOf(matchIds).toArray();
  const setIds = sets.map(s => s.id);
  return setIds.length
    ? db.rallies.where('set_id').anyOf(setIds).toArray()
    : [];
};
