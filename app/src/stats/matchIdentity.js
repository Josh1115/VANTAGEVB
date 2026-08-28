// Cross-device match identity — folding duplicate "scheduled" placeholder
// matches into the single real game they represent, so every device that syncs
// the same account converges on one match per game.
//
// Why this is needed: cloud sync recognizes "the same match" across devices by
// its permanent `uid` (see db/schema.js), or — as a fallback for rows that
// predate `uid` or were created independently on another device — by the
// natural key (season + opponent name + date). When the same real-world game is
// scheduled independently on two devices, those two rows have different `uid`s;
// and if a scheduled entry is left behind after the game is played (or a date /
// opponent gets edited), the natural key stops lining up too. Either way the
// game ends up listed twice. This module finds those cases and plans which rows
// to remove.
//
// SAFETY: the planner only ever proposes deleting a *placeholder* — a match
// with status "scheduled" and zero recorded stats (no sets, no contacts). A
// match that has any live data is never proposed for deletion. Two genuinely
// different games (e.g. the same opponent twice in one tournament) are always
// kept: they differ by date, or by time, or both carry stats once played.

import { MATCH_STATUS } from '../constants';

const norm = (s) => (s ?? '').trim().toLowerCase();
const day  = (d) => (d ?? '').slice(0, 10);

// Everything a coach could use to tell two same-opponent games apart. Two
// placeholders that match on all of this are treated as the same game
// double-entered (e.g. once per device), not as a real doubleheader.
export function distinguishKey(m) {
  return [
    m.season_id,
    norm(m.opponent_name),
    day(m.date),
    m.match_time ?? '',
    m.match_type ?? '',
    m.tournament_round ?? '',
  ].join('|');
}

// The natural key cloud sync and tombstones use (season + opponent + date).
export function naturalKey(m) {
  return `${m.season_id}|${norm(m.opponent_name)}|${day(m.date)}`;
}

// Deterministic across devices: both sides of a sync must independently pick the
// SAME survivor out of a group of duplicates, so order by the permanent `uid`
// (present on every row created since schema v23). Legacy rows without a `uid`
// fall back to updated_at, then a stable stringified id.
export function pickSurvivor(rows) {
  return [...rows].sort((a, b) => {
    const ua = a.uid ?? '';
    const ub = b.uid ?? '';
    if (ua !== ub) return ua < ub ? -1 : 1;
    const ta = a.updated_at ?? '';
    const tb = b.updated_at ?? '';
    if (ta !== tb) return ta < tb ? -1 : 1;
    return String(a.id) < String(b.id) ? -1 : 1;
  })[0];
}

// ── Planner ──────────────────────────────────────────────────────────────────
//
//   matches      — all local match rows
//   hasStats(id) — true when that match has any sets or contacts
//
// Returns { deletions: [{ loserId, survivorId, reason }] }. The caller cascade-
// deletes each loserId. No tombstones are involved: every device runs this same
// deterministic pass after a sync, so a placeholder removed here is removed
// identically everywhere — there is nothing to "propagate".
export function planMatchDedup(matches, hasStats) {
  const isPlaceholder = (m) =>
    m.status === MATCH_STATUS.SCHEDULED && !hasStats(m.id);

  const isPlayed = (m) =>
    !isPlaceholder(m) &&
    (hasStats(m.id) ||
      m.status === MATCH_STATUS.IN_PROGRESS ||
      m.status === MATCH_STATUS.COMPLETE);

  const placeholders = matches.filter(isPlaceholder);
  const played       = matches.filter(isPlayed);

  const deletions = [];
  const consumed  = new Set();

  // ── Part B first: a placeholder for a game that has already been played ──
  // If exactly one played game sits in the same season, against the same
  // opponent, on the same day (and times don't actively disagree), the
  // placeholder is that game's leftover schedule entry — drop it. Requiring
  // *exactly one* match keeps a real doubleheader (two played games same day)
  // out of this — that goes to the manual review screen instead.
  for (const p of placeholders) {
    const hits = played.filter((r) =>
      r.season_id === p.season_id &&
      norm(r.opponent_name) === norm(p.opponent_name) &&
      day(r.date) === day(p.date) &&
      (!p.match_time || !r.match_time || p.match_time === r.match_time)
    );
    if (hits.length === 1) {
      deletions.push({ loserId: p.id, survivorId: hits[0].id, reason: 'scheduled-already-played' });
      consumed.add(p.id);
    }
  }

  // ── Part A: fold placeholders that are indistinguishable from each other ──
  const groups = new Map();
  for (const p of placeholders) {
    if (consumed.has(p.id)) continue;
    const k = distinguishKey(p);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const survivor = pickSurvivor(group);
    for (const loser of group) {
      if (loser.id === survivor.id) continue;
      deletions.push({ loserId: loser.id, survivorId: survivor.id, reason: 'duplicate-scheduled' });
      consumed.add(loser.id);
    }
  }

  return { deletions };
}
