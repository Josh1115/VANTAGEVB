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

// A match whose opponent hasn't been assigned yet: blank, or the literal "TBD"
// coaches type into pre-scheduled tournament slots.
const isBlankOpp = (m) => {
  const o = norm(m.opponent_name);
  return o === '' || o === 'tbd';
};

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

// When a sync finds the incoming and local copies of a match are BOTH still
// untouched "scheduled" placeholders but carry different permanent ids — each
// device scheduled the same game on its own — pick the one id both sides should
// converge on (the lexically-smaller uid, matching pickSurvivor). Once they
// share an id, a later edit to the date / opponent / time keeps the game as one
// record instead of splitting into a duplicate. Returns the uid to write onto
// the local row, or null when there is nothing to change.
//
// Deliberately limited to placeholders: a match with any live data is never
// re-keyed, and two genuinely different games (a real rematch) differ by date
// or time so they are matched as separate rows in the first place, never here.
export function convergedPlaceholderUid(impMatch, exMatch) {
  if (!impMatch || !exMatch) return null;
  if (!impMatch.uid || !exMatch.uid) return null;
  if (impMatch.uid === exMatch.uid) return null;
  if (impMatch.status !== MATCH_STATUS.SCHEDULED) return null;
  if (exMatch.status  !== MATCH_STATUS.SCHEDULED) return null;
  // Same opponent + date but different start times = two different games in one
  // tournament day, not one game scheduled twice — never fuse their identities.
  if ((impMatch.match_time ?? '') !== (exMatch.match_time ?? '')) return null;
  const winner = impMatch.uid < exMatch.uid ? impMatch.uid : exMatch.uid;
  return winner === exMatch.uid ? null : winner;
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

  // ── Part C: a "TBD" tournament slot that has since been assigned ──
  // Coaches pre-schedule a tournament's games as "TBD" at fixed start times,
  // then edit each to the real opponent as it's played. That opponent edit
  // breaks the natural-key link to the cloud's copy of the slot, so the stale
  // "TBD" row comes back on a sync. The fixed slot TIME identifies it safely:
  // a blank / "TBD" placeholder is a leftover when exactly one non-blank game
  // (played or still scheduled) sits in the same season, same day, same start
  // time. A "TBD" slot with no game at its time is a genuine unassigned game
  // and is left alone.
  for (const p of placeholders) {
    if (consumed.has(p.id)) continue;
    if (!isBlankOpp(p) || !p.match_time) continue;
    const assigned = matches.filter((r) =>
      r.id !== p.id &&
      !isBlankOpp(r) &&
      r.season_id === p.season_id &&
      day(r.date) === day(p.date) &&
      r.match_time && r.match_time === p.match_time
    );
    if (assigned.length === 1) {
      deletions.push({ loserId: p.id, survivorId: assigned[0].id, reason: 'tbd-slot-assigned' });
      consumed.add(p.id);
    }
  }

  // ── Part D: two "played" copies of one game, only one carries real stats ──
  // A sync race or a duplicate entry (e.g. a score typed in via "log result
  // only" before the same game got scored live on another device) can leave
  // two non-placeholder rows for one finished game — one with real
  // sets/contacts, one empty. When exactly two played rows share season +
  // opponent + day (and don't actively disagree on time) and exactly one of
  // them has stats, the empty one is the leftover — drop it, keep the one
  // with data. Groups of more than two, or pairs where both/neither side has
  // stats, are left alone (could be a real doubleheader or an honest scoring
  // conflict) — those still go to the manual review screen.
  const playedRemaining = played.filter((r) => !consumed.has(r.id));
  for (const m of playedRemaining) {
    if (consumed.has(m.id)) continue;
    const cluster = playedRemaining.filter((r) =>
      !consumed.has(r.id) &&
      r.season_id === m.season_id &&
      norm(r.opponent_name) === norm(m.opponent_name) &&
      day(r.date) === day(m.date) &&
      (!r.match_time || !m.match_time || r.match_time === m.match_time)
    );
    if (cluster.length !== 2) continue;
    const withStats = cluster.filter((r) => hasStats(r.id));
    if (withStats.length !== 1) continue;
    const survivor = withStats[0];
    const loser = cluster.find((r) => r.id !== survivor.id);
    deletions.push({ loserId: loser.id, survivorId: survivor.id, reason: 'complete-duplicate-no-stats' });
    consumed.add(loser.id);
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
