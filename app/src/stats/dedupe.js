import { db } from '../db/schema';

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

// ── Matches ──────────────────────────────────────────────────────────────────
// Matches carry live stats (sets/rallies/contacts), so this deliberately does
// NOT auto-merge them — two matches with the same date could genuinely be two
// different games. This only surfaces likely duplicates (same season + same
// date) for a coach to look at and delete manually from the match's own page.

export async function findLikelyDuplicateMatches() {
  const [matches, sets, seasons, teams] = await Promise.all([
    db.matches.toArray(),
    db.sets.toArray(),
    db.seasons.toArray(),
    db.teams.toArray(),
  ]);
  const setCountByMatch = new Map();
  for (const s of sets) setCountByMatch.set(s.match_id, (setCountByMatch.get(s.match_id) ?? 0) + 1);
  const seasonById = new Map(seasons.map(s => [s.id, s]));
  const teamById   = new Map(teams.map(t => [t.id, t]));

  const groups = new Map();
  for (const m of matches) {
    const key = `${m.season_id}|${(m.date ?? '').slice(0, 10)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }

  const dupes = [];
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const season = seasonById.get(group[0].season_id);
    const team   = season ? teamById.get(season.team_id) : null;
    dupes.push({
      teamName:   team?.name ?? 'Unknown team',
      seasonYear: season?.year ?? '?',
      matches: group.map(m => ({
        id:           m.id,
        opponentName: m.opponent_name ?? 'Unknown',
        date:         (m.date ?? '').slice(0, 10),
        status:       m.status,
        setCount:     setCountByMatch.get(m.id) ?? 0,
      })),
    });
  }
  return dupes;
}
