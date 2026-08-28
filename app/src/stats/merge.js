import { db } from '../db/schema';
import { planMatchDedup, convergedPlaceholderUid } from './matchIdentity';

// ── Helpers ───────────────────────────────────────────────────────────────────

function norm(s) { return (s ?? '').trim().toLowerCase(); }

function groupBy(arr, key) {
  const map = new Map();
  for (const item of arr) {
    const k = item[key];
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(item);
  }
  return map;
}

// Prefer matching by permanent id (`uid`, set once at creation and never changed —
// see db/schema.js) over the natural-key guess below. This is what lets editing a
// matched field (renaming an opponent, adding a jersey number) still be recognized
// as "the same record, updated" instead of registering as a brand-new one and
// getting duplicated. Falls back to the natural key for records created before
// `uid` existed, or synced in from a device that hasn't taken this fix yet.
function pickExisting(imp, byUid, byKey, key) {
  if (imp.uid) {
    const hit = byUid.get(imp.uid);
    if (hit) return hit;
  }
  return byKey.get(key);
}

// Whether an incoming record is a newer edit than the one we have locally —
// used to decide whether to actually adopt its fields once matched.
function isNewer(imp, ex) {
  return (imp.updated_at ?? '') > (ex.updated_at ?? '');
}

// Natural keys — fallback match for records that predate `uid`
const nkOrg    = o => norm(o.name);
const nkTeam   = t => `${norm(t.name)}|${t.gender ?? ''}|${t.level ?? ''}`;
const nkSeason = s => String(s.year ?? '');
// Name only (within the team scope already baked into the caller's key prefix) —
// jersey number is a mutable, coach-editable field, not part of a player's
// identity. Including it here used to mean any number change made on one
// device before syncing looked like a brand-new player instead of an edit,
// duplicating the roster (see stats/dedupe.js, which cleans up the fallout).
const nkPlayer = p => norm(p.name);
const nkOpp    = o => norm(o.name);
const nkMatch  = m => `${norm(m.opponent_name)}|${(m.date ?? '').slice(0, 10)}`;

// Natural keys for the additive record tables below — deliberately built from
// each record's true identity, not fields a coach can edit afterward. (The
// historical-records key used to include `value`, so correcting a stat
// duplicated the record instead of updating it — same bug class as the core
// tables above, fixed here the same way: uid first, this key as a fallback.)
const nkHistorical  = h => `${norm(h.category)}|${norm(h.stat)}|${norm(h.player_name ?? '')}`;
const nkSeasonHist  = h => String(h.year ?? '');
const nkTourney     = t => `${norm(t.name)}|${String(t.year ?? '')}`;
const nkCommit      = c => `${norm(c.player_name)}|${String(c.grad_year ?? '')}`;
const nkAccType     = t => norm(t.name);
const nkAccWinner   = w => `${norm(w.player_name)}|${String(w.year ?? '')}`;
const nkSavedLineup = l => norm(l.name);
const nkPractice    = p => `${p.tool_type ?? ''}|${p.date ?? ''}`;

// ── Tombstones ────────────────────────────────────────────────────────────────
// Deliberate deletes are recorded here (by natural key, not local row id, since
// ids differ per device) so a cloud sync can't silently re-add something the user
// threw away. Keys are built from the same natural-key fields as the nk* helpers
// above so a deleted item and its cloud twin always hash to the same string.

export function tombstoneKeyForOrg(orgName) {
  return norm(orgName);
}
export function tombstoneKeyForTeam(orgName, team) {
  return `${norm(orgName)}|${nkTeam(team)}`;
}
export function tombstoneKeyForMatch(orgName, team, seasonYear, match) {
  return `${norm(orgName)}|${nkTeam(team)}|${String(seasonYear ?? '')}|${nkMatch(match)}`;
}

// Records a delete. De-duped on (type, key) so re-deleting something that's
// already gone (e.g. via a stale UI state) doesn't pile up duplicate rows.
export async function addTombstone(type, key) {
  const existing = await db.tombstones.where('[type+key]').equals([type, key]).first();
  if (existing) return;
  await db.tombstones.add({ type, key, deleted_at: new Date().toISOString() });
}

// A match tombstone is "outdated" once a match with the same natural key exists
// that was created/edited AFTER the delete was recorded — i.e. the user
// deliberately put the game back. In that case the re-created match wins and the
// tombstone should be dropped so it stops deleting it on every sync.
export function isMatchTombstoneOutdated(tomb, match) {
  const mts = match?.updated_at ?? '';
  return !!tomb?.deleted_at && mts !== '' && mts > tomb.deleted_at;
}

// Inverse of the delete → addTombstone path: when the user deliberately
// (re-)creates a match, drop any "deleted" marker for the same game (same
// opponent + date within the season) so the next cloud sync doesn't remove the
// new one. Safe to call on every match create/schedule.
export async function clearMatchTombstone(match) {
  if (!match || match.season_id == null) return;
  try {
    const season = await db.seasons.get(match.season_id);
    const team   = season ? await db.teams.get(season.team_id) : null;
    const org    = team ? await db.organizations.get(team.org_id) : null;
    if (!season || !team || !org) return;
    const key = tombstoneKeyForMatch(org.name, team, season.year, match);
    await db.tombstones.where('[type+key]').equals(['match', key]).delete();
  } catch {
    // Best-effort — if this fails the marker stays and the sync-time staleness
    // check (isMatchTombstoneOutdated) still clears it on the next sync.
  }
}

// ── Phase 1 — Preview (read-only) ─────────────────────────────────────────────

export async function parseMergePreview(file) {
  let data;
  try {
    const text = await file.text();
    data = JSON.parse(text);
  } catch {
    return { valid: false, error: 'Invalid file — could not parse JSON.' };
  }
  return parseMergePreviewFromData(data);
}

// Same as parseMergePreview, but for callers that already have a parsed backup
// object (e.g. a cloud payload) instead of a File to read.
export async function parseMergePreviewFromData(data) {
  if (!data.version) return { valid: false, error: 'Invalid backup: missing version field.' };

  const required = ['organizations', 'teams', 'seasons', 'players', 'opponents', 'matches', 'sets', 'rallies', 'contacts'];
  const missing  = required.filter(t => !Array.isArray(data[t]));
  if (missing.length) return { valid: false, error: `Missing tables: ${missing.join(', ')}` };

  // Load existing DB records needed to classify imported matches
  const [exOrgs, exTeams, exSeasons, exMatches, exContacts, exTombstones] = await Promise.all([
    db.organizations.toArray(),
    db.teams.toArray(),
    db.seasons.toArray(),
    db.matches.toArray(),
    db.contacts.toArray(),
    db.tombstones.toArray(),
  ]);

  const exOrgByKey    = new Map(exOrgs.map(o    => [nkOrg(o),                       o]));
  const exTeamByKey   = new Map(exTeams.map(t   => [`${t.org_id}|${nkTeam(t)}`,     t]));
  const exSeasonByKey = new Map(exSeasons.map(s => [`${s.team_id}|${nkSeason(s)}`,  s]));
  const exMatchByKey  = new Map(exMatches.map(m => [`${m.season_id}|${nkMatch(m)}`, m]));
  const exOrgByUid    = new Map(exOrgs.filter(o => o.uid).map(o    => [o.uid, o]));
  const exTeamByUid   = new Map(exTeams.filter(t => t.uid).map(t   => [t.uid, t]));
  const exSeasonByUid = new Map(exSeasons.filter(s => s.uid).map(s => [s.uid, s]));
  const exMatchByUid  = new Map(exMatches.filter(m => m.uid).map(m => [m.uid, m]));
  const exOrgById     = new Map(exOrgs.map(o    => [o.id, o]));
  const exTeamById    = new Map(exTeams.map(t   => [t.id, t]));
  const exSeasonById  = new Map(exSeasons.map(s => [s.id, s]));
  const tombstoneSet  = new Set(exTombstones.map(t => `${t.type}::${t.key}`));
  const matchTombByKey = new Map(exTombstones.filter(t => t.type === 'match').map(t => [t.key, t]));

  const exContactsByMatch = new Map();
  for (const c of exContacts) {
    exContactsByMatch.set(c.match_id, (exContactsByMatch.get(c.match_id) ?? 0) + 1);
  }

  // Build imported-id → existing-id maps for hierarchy above match
  const impOrgMap    = new Map();
  const impTeamMap   = new Map();
  const impSeasonMap = new Map();

  for (const o of data.organizations) {
    const ex = pickExisting(o, exOrgByUid, exOrgByKey, nkOrg(o));
    if (ex) impOrgMap.set(o.id, ex.id);
  }
  for (const t of data.teams) {
    const exOrgId = impOrgMap.get(t.org_id);
    if (exOrgId == null) continue;
    const ex = pickExisting(t, exTeamByUid, exTeamByKey, `${exOrgId}|${nkTeam(t)}`);
    if (ex) impTeamMap.set(t.id, ex.id);
  }
  for (const s of data.seasons) {
    const exTeamId = impTeamMap.get(s.team_id);
    if (exTeamId == null) continue;
    const ex = pickExisting(s, exSeasonByUid, exSeasonByKey, `${exTeamId}|${nkSeason(s)}`);
    if (ex) impSeasonMap.set(s.id, ex.id);
  }

  // Contact and set counts per imported match
  const impContactsByMatch = new Map();
  for (const c of data.contacts) {
    impContactsByMatch.set(c.match_id, (impContactsByMatch.get(c.match_id) ?? 0) + 1);
  }
  const impSeasonById = new Map(data.seasons.map(s => [s.id, s]));

  const newMatches = [];
  const conflicts  = [];

  for (const m of data.matches) {
    const exSeasonId = impSeasonMap.get(m.season_id);
    const seasonYear = impSeasonById.get(m.season_id)?.year ?? '?';

    const info = {
      id:           m.id,
      opponentName: m.opponent_name ?? 'Unknown',
      date:         (m.date ?? '').slice(0, 10),
      ourSetsWon:   m.our_sets_won  ?? 0,
      oppSetsWon:   m.opp_sets_won  ?? 0,
      contactCount: impContactsByMatch.get(m.id) ?? 0,
      status:       m.status,
      seasonYear,
    };

    if (exSeasonId == null) {
      newMatches.push(info);
      continue;
    }

    const exMatch = pickExisting(m, exMatchByUid, exMatchByKey, `${exSeasonId}|${nkMatch(m)}`);
    if (!exMatch) {
      // Don't offer to re-add a match the user deliberately deleted on this
      // device — unless the incoming copy is newer than that delete, meaning
      // the game was intentionally re-created somewhere.
      const season = exSeasonById.get(exSeasonId);
      const team   = season ? exTeamById.get(season.team_id) : null;
      const org    = team ? exOrgById.get(team.org_id) : null;
      if (season && team && org) {
        const tomb = matchTombByKey.get(tombstoneKeyForMatch(org.name, team, season.year, m));
        if (tomb && !isMatchTombstoneOutdated(tomb, m)) continue;
      }
      newMatches.push(info);
    } else {
      conflicts.push({
        importedId: m.id,
        imported:   info,
        current: {
          id:           exMatch.id,
          opponentName: exMatch.opponent_name ?? 'Unknown',
          date:         (exMatch.date ?? '').slice(0, 10),
          ourSetsWon:   exMatch.our_sets_won  ?? 0,
          oppSetsWon:   exMatch.opp_sets_won  ?? 0,
          contactCount: exContactsByMatch.get(exMatch.id) ?? 0,
          status:       exMatch.status,
          seasonYear,
        },
      });
    }
  }

  return { valid: true, error: null, newMatches, conflicts, _data: data };
}

// ── Phase 2 — Execute ─────────────────────────────────────────────────────────

// decisions: { [importedMatchId]: 'keep' | 'replace' }
// matches absent from decisions are new and always imported
export async function executeMerge(preview, decisions, { isMaster = true, matchLimit = Infinity } = {}) {
  const data = preview._data;

  const impSetsByMatch   = groupBy(data.sets,                  'match_id');
  const impLineupsBySet  = groupBy(data.lineups        ?? [],  'set_id');
  const impSubsBySet     = groupBy(data.substitutions  ?? [],  'set_id');
  const impRalliesBySet  = groupBy(data.rallies,               'set_id');
  const impContactsBySet = groupBy(data.contacts,              'set_id');

  const [exOrgs, exTeams, exSeasons, exPlayers, exOpps, exMatches] = await Promise.all([
    db.organizations.toArray(),
    db.teams.toArray(),
    db.seasons.toArray(),
    db.players.toArray(),
    db.opponents.toArray(),
    db.matches.toArray(),
  ]);

  // Build per-season effective count (high-water mark of live vs stored peak)
  const seasonEffectiveCounts = new Map();
  for (const s of exSeasons) {
    const live = exMatches.filter(m => m.season_id === s.id).length;
    seasonEffectiveCounts.set(s.id, Math.max(live, s.peak_match_count ?? 0));
  }

  const exOrgByKey    = new Map(exOrgs.map(o    => [nkOrg(o),                       o]));
  const exTeamByKey   = new Map(exTeams.map(t   => [`${t.org_id}|${nkTeam(t)}`,     t]));
  const exSeasonByKey = new Map(exSeasons.map(s => [`${s.team_id}|${nkSeason(s)}`,  s]));
  const exPlayerByKey = new Map(exPlayers.map(p => [`${p.team_id}|${nkPlayer(p)}`,  p]));
  const exOppByKey    = new Map(exOpps.map(o    => [nkOpp(o),                       o]));
  const exMatchByKey  = new Map(exMatches.map(m => [`${m.season_id}|${nkMatch(m)}`, m]));

  const exOrgByUid    = new Map(exOrgs.filter(o    => o.uid).map(o    => [o.uid, o]));
  const exTeamByUid   = new Map(exTeams.filter(t   => t.uid).map(t   => [t.uid, t]));
  const exSeasonByUid = new Map(exSeasons.filter(s => s.uid).map(s => [s.uid, s]));
  const exPlayerByUid = new Map(exPlayers.filter(p => p.uid).map(p => [p.uid, p]));
  const exOppByUid    = new Map(exOpps.filter(o    => o.uid).map(o    => [o.uid, o]));
  const exMatchByUid  = new Map(exMatches.filter(m => m.uid).map(m => [m.uid, m]));

  // Lookups by local id, seeded from existing rows and extended as new rows are
  // added below — used to walk match → season → team → org for tombstone checks.
  const orgNameById = new Map(exOrgs.map(o => [o.id, o.name]));
  const teamById    = new Map(exTeams.map(t => [t.id, t]));
  const seasonById  = new Map(exSeasons.map(s => [s.id, s]));

  const orgMap    = new Map(); // imported id → db id
  const teamMap   = new Map();
  const seasonMap = new Map();
  const playerMap = new Map();
  const oppMap    = new Map();

  let matchesAdded      = 0;
  let matchesReplaced   = 0;
  let matchesSkipped    = 0;
  let matchesTombstoned = 0;

  await db.transaction('rw', db.tables, async () => {

    // ── 0. Tombstones ───────────────────────────────────────────────────────
    // Union any deletions the cloud side knows about into our local list (so a
    // delete recorded on one device eventually reaches every other device too),
    // then load the full set for the skip-checks below.
    if (Array.isArray(data.tombstones) && data.tombstones.length) {
      const exTombRows = await db.tombstones.toArray();
      const exTombSet  = new Set(exTombRows.map(t => `${t.type}::${t.key}`));
      const toAdd = [];
      for (const t of data.tombstones) {
        const k = `${t.type}::${t.key}`;
        if (!exTombSet.has(k)) { toAdd.push({ type: t.type, key: t.key, deleted_at: t.deleted_at }); exTombSet.add(k); }
      }
      if (toAdd.length) await db.tombstones.bulkAdd(toAdd);
    }
    const allTombRows  = await db.tombstones.toArray();
    const tombstoneSet  = new Set(allTombRows.map(t => `${t.type}::${t.key}`));
    const matchTombByKey = new Map(allTombRows.filter(t => t.type === 'match').map(t => [t.key, t]));

    // Drop a stale match tombstone (locally + from the working sets) once the
    // user has re-created the game it was blocking. Returns true when dropped.
    async function dropTombstoneIfOutdated(key, match) {
      const tomb = matchTombByKey.get(key);
      if (!tomb || !isMatchTombstoneOutdated(tomb, match)) return false;
      await db.tombstones.delete(tomb.id);
      matchTombByKey.delete(key);
      tombstoneSet.delete(`match::${key}`);
      return true;
    }

    // ── 1. Organizations ───────────────────────────────────────────────────
    for (const o of data.organizations) {
      const ex = pickExisting(o, exOrgByUid, exOrgByKey, nkOrg(o));
      if (ex) {
        orgMap.set(o.id, ex.id);
        if (isNewer(o, ex)) {
          const { id: _, ...fields } = o;
          await db.organizations.update(ex.id, fields);
          Object.assign(ex, fields);
          orgNameById.set(ex.id, fields.name);
        }
        continue;
      }
      if (tombstoneSet.has(`organization::${tombstoneKeyForOrg(o.name)}`)) continue;
      const { id: _, ...rest } = o;
      const newId = await db.organizations.add(rest);
      orgMap.set(o.id, newId);
      orgNameById.set(newId, rest.name);
      exOrgByKey.set(nkOrg({ ...rest, id: newId }), { ...rest, id: newId });
    }

    // ── 2. Teams ───────────────────────────────────────────────────────────
    for (const t of data.teams) {
      const exOrgId = orgMap.get(t.org_id);
      if (exOrgId == null) continue;
      const ex = pickExisting(t, exTeamByUid, exTeamByKey, `${exOrgId}|${nkTeam(t)}`);
      if (ex) {
        teamMap.set(t.id, ex.id);
        if (isNewer(t, ex)) {
          const { id: _, org_id: __, ...fields } = t;
          await db.teams.update(ex.id, fields);
          Object.assign(ex, fields);
        }
        continue;
      }
      const orgName = orgNameById.get(exOrgId);
      if (tombstoneSet.has(`team::${tombstoneKeyForTeam(orgName, t)}`)) continue;
      const { id: _, org_id: __, ...rest } = t;
      const newId = await db.teams.add({ ...rest, org_id: exOrgId });
      teamMap.set(t.id, newId);
      teamById.set(newId, { ...rest, id: newId, org_id: exOrgId });
      exTeamByKey.set(`${exOrgId}|${nkTeam({ ...rest, id: newId })}`, { ...rest, id: newId, org_id: exOrgId });
    }

    // ── 3. Seasons ─────────────────────────────────────────────────────────
    for (const s of data.seasons) {
      const exTeamId = teamMap.get(s.team_id);
      if (exTeamId == null) continue;
      const ex = pickExisting(s, exSeasonByUid, exSeasonByKey, `${exTeamId}|${nkSeason(s)}`);
      if (ex) {
        seasonMap.set(s.id, ex.id);
        if (isNewer(s, ex)) {
          const { id: _, team_id: __, ...fields } = s;
          await db.seasons.update(ex.id, fields);
          Object.assign(ex, fields);
        }
        continue;
      }
      const { id: _, team_id: __, ...rest } = s;
      const newId = await db.seasons.add({ ...rest, team_id: exTeamId });
      seasonMap.set(s.id, newId);
      seasonById.set(newId, { ...rest, id: newId, team_id: exTeamId });
    }

    // ── 4. Players ─────────────────────────────────────────────────────────
    for (const p of data.players) {
      const exTeamId = teamMap.get(p.team_id);
      if (exTeamId == null) continue;
      const ex = pickExisting(p, exPlayerByUid, exPlayerByKey, `${exTeamId}|${nkPlayer(p)}`);
      if (ex) {
        playerMap.set(p.id, ex.id);
        if (isNewer(p, ex)) {
          const { id: _, team_id: __, ...fields } = p;
          await db.players.update(ex.id, fields);
          Object.assign(ex, fields);
        }
        continue;
      }
      const { id: _, team_id: __, ...rest } = p;
      const newId = await db.players.add({ ...rest, team_id: exTeamId });
      playerMap.set(p.id, newId);
      exPlayerByKey.set(`${exTeamId}|${nkPlayer({ ...rest, id: newId })}`, { ...rest, id: newId, team_id: exTeamId });
    }

    // ── 5. Opponents ───────────────────────────────────────────────────────
    for (const o of data.opponents) {
      const ex = pickExisting(o, exOppByUid, exOppByKey, nkOpp(o));
      if (ex) {
        oppMap.set(o.id, ex.id);
        if (isNewer(o, ex)) {
          const { id: _, ...fields } = o;
          await db.opponents.update(ex.id, fields);
          Object.assign(ex, fields);
        }
        continue;
      }
      const { id: _, ...rest } = o;
      const newId = await db.opponents.add(rest);
      oppMap.set(o.id, newId);
      exOppByKey.set(nkOpp({ ...rest, id: newId }), { ...rest, id: newId });
    }

    // Cascade-delete a locally-existing match row (same steps as deleteMatch()
    // in queries.js) — shared by the "replace with imported" and "propagate a
    // remote delete" cases below.
    async function cascadeDeleteMatchRow(matchId) {
      const exSets   = await db.sets.where('match_id').equals(matchId).toArray();
      const exSetIds = exSets.map(s => s.id);
      await db.contacts.where('match_id').equals(matchId).delete();
      if (exSetIds.length) {
        await db.rallies.where('set_id').anyOf(exSetIds).delete();
        await db.lineups.where('set_id').anyOf(exSetIds).delete();
        await db.substitutions.where('set_id').anyOf(exSetIds).delete();
      }
      await db.sets.where('match_id').equals(matchId).delete();
      await db.matches.delete(matchId);
    }

    // ── 5b. Propagate remote deletions ────────────────────────────────────
    // A device that deletes a match also removes it from its own `matches`
    // table, so only its tombstone travels in the payload it uploads — the
    // match row itself is simply absent from data.matches, never "in conflict"
    // with anything. A device that never deleted it still has its own copy, so
    // without this pass it always "wins" its own keep-local default on every
    // sync and the deletion can never actually reach it. Check every match we
    // still have locally against the (now-unioned) tombstone set directly,
    // independent of whatever the incoming payload's matches array contains.
    for (const m of exMatches) {
      const season  = seasonById.get(m.season_id);
      const team    = season ? teamById.get(season.team_id) : null;
      const orgName = team ? orgNameById.get(team.org_id) : null;
      if (!season || !team || orgName == null) continue;
      const key = tombstoneKeyForMatch(orgName, team, season.year, m);
      if (!matchTombByKey.has(key)) continue;
      // The user re-created this game after the delete — drop the stale marker
      // and keep the match instead of deleting it again.
      if (await dropTombstoneIfOutdated(key, m)) continue;
      await cascadeDeleteMatchRow(m.id);
      exMatchByKey.delete(`${m.season_id}|${nkMatch(m)}`);
      matchesTombstoned++;
    }

    // ── 6. Matches ─────────────────────────────────────────────────────────
    for (const impMatch of data.matches) {
      const decision   = decisions[impMatch.id]; // 'keep' | 'replace' | undefined = new
      const exSeasonId = seasonMap.get(impMatch.season_id);
      if (exSeasonId == null) continue;

      const exMatch = pickExisting(impMatch, exMatchByUid, exMatchByKey, `${exSeasonId}|${nkMatch(impMatch)}`);

      if (decision === 'keep') {
        // Two devices that each scheduled the same game hold separate rows with
        // separate `uid`s; sync otherwise keeps them lined up only by natural
        // key (season + opponent + date), which stops matching the moment
        // either is edited. While both copies are still untouched "scheduled"
        // placeholders — nothing at stake — converge them onto one deterministic
        // `uid` so a later date / opponent / time change rides on a shared id
        // and can't split into a duplicate. `updated_at` is carried through
        // unchanged so this housekeeping isn't seen as a content edit.
        const convergedUid = convergedPlaceholderUid(impMatch, exMatch);
        if (convergedUid) {
          const mods = { uid: convergedUid };
          if (exMatch.updated_at != null) mods.updated_at = exMatch.updated_at;
          await db.matches.update(exMatch.id, mods);
          exMatch.uid = convergedUid;
          exMatchByUid.set(convergedUid, exMatch);
        }
        continue;
      }

      // Don't resurrect a match the user deliberately deleted on this device —
      // unless the incoming copy is newer than that delete, meaning the game was
      // intentionally re-created elsewhere (then drop the stale marker).
      if (decision == null) {
        const season = seasonById.get(exSeasonId);
        const team   = season ? teamById.get(season.team_id) : null;
        const orgName = team ? orgNameById.get(team.org_id) : null;
        if (season && team && orgName != null) {
          const key = tombstoneKeyForMatch(orgName, team, season.year, impMatch);
          if (matchTombByKey.has(key) && !(await dropTombstoneIfOutdated(key, impMatch))) {
            matchesTombstoned++;
            continue;
          }
        }
      }

      // Net-new matches are subject to the per-season match limit
      if (decision == null && !isMaster) {
        const effectiveCount = seasonEffectiveCounts.get(exSeasonId) ?? 0;
        if (effectiveCount >= matchLimit) {
          matchesSkipped++;
          continue;
        }
      }

      if (decision === 'replace' && exMatch) {
        await cascadeDeleteMatchRow(exMatch.id);
        matchesReplaced++;
      }

      // Insert match
      const matchToInsert  = { ...impMatch };
      delete matchToInsert.id;
      matchToInsert.season_id   = exSeasonId;
      matchToInsert.opponent_id = impMatch.opponent_id != null
        ? (oppMap.get(impMatch.opponent_id) ?? null)
        : null;
      const newMatchId = await db.matches.add(matchToInsert);
      if (decision == null) {
        matchesAdded++;
        const newPeak = (seasonEffectiveCounts.get(exSeasonId) ?? 0) + 1;
        seasonEffectiveCounts.set(exSeasonId, newPeak);
        await db.seasons.update(exSeasonId, { peak_match_count: newPeak });
      }

      // ── Sets ──────────────────────────────────────────────────────────
      const impSets  = impSetsByMatch.get(impMatch.id) ?? [];
      const localSetMap = new Map(); // imp set id → new set id

      if (impSets.length) {
        const setRows = impSets.map(s => {
          const row = { ...s, match_id: newMatchId };
          delete row.id;
          return row;
        });
        const newSetIds = await db.sets.bulkAdd(setRows, { allKeys: true });
        impSets.forEach((s, i) => localSetMap.set(s.id, newSetIds[i]));
      }

      // ── Lineups ───────────────────────────────────────────────────────
      const lineupRows = [];
      for (const impSet of impSets) {
        const newSetId = localSetMap.get(impSet.id);
        if (newSetId == null) continue;
        for (const lu of impLineupsBySet.get(impSet.id) ?? []) {
          const row = { ...lu, set_id: newSetId, player_id: lu.player_id != null ? (playerMap.get(lu.player_id) ?? null) : null };
          delete row.id;
          lineupRows.push(row);
        }
      }
      if (lineupRows.length) await db.lineups.bulkAdd(lineupRows);

      // ── Substitutions ─────────────────────────────────────────────────
      const subRows = [];
      for (const impSet of impSets) {
        const newSetId = localSetMap.get(impSet.id);
        if (newSetId == null) continue;
        for (const sub of impSubsBySet.get(impSet.id) ?? []) {
          const row = {
            ...sub,
            set_id:        newSetId,
            player_in_id:  sub.player_in_id  != null ? (playerMap.get(sub.player_in_id)  ?? null) : null,
            player_out_id: sub.player_out_id != null ? (playerMap.get(sub.player_out_id) ?? null) : null,
          };
          delete row.id;
          subRows.push(row);
        }
      }
      if (subRows.length) await db.substitutions.bulkAdd(subRows);

      // ── Rallies ───────────────────────────────────────────────────────
      const localRallyMap = new Map();
      const rallyOrigIds  = [];
      const rallyRows     = [];
      for (const impSet of impSets) {
        const newSetId = localSetMap.get(impSet.id);
        if (newSetId == null) continue;
        for (const rally of impRalliesBySet.get(impSet.id) ?? []) {
          rallyOrigIds.push(rally.id);
          const row = { ...rally, set_id: newSetId };
          delete row.id;
          rallyRows.push(row);
        }
      }
      if (rallyRows.length) {
        const newRallyIds = await db.rallies.bulkAdd(rallyRows, { allKeys: true });
        rallyOrigIds.forEach((origId, i) => localRallyMap.set(origId, newRallyIds[i]));
      }

      // ── Contacts ──────────────────────────────────────────────────────
      const contactRows = [];
      for (const impSet of impSets) {
        const newSetId = localSetMap.get(impSet.id);
        if (newSetId == null) continue;
        for (const c of impContactsBySet.get(impSet.id) ?? []) {
          const row = {
            ...c,
            match_id:  newMatchId,
            set_id:    newSetId,
            rally_id:  c.rally_id  != null ? (localRallyMap.get(c.rally_id)  ?? null) : null,
            player_id: c.player_id != null ? (playerMap.get(c.player_id)     ?? null) : null,
          };
          delete row.id;
          contactRows.push(row);
        }
      }
      if (contactRows.length) await db.contacts.bulkAdd(contactRows);
    }

    // ── 7. Historical records ──────────────────────────────────────────────
    if (Array.isArray(data.historical_records)) {
      const exHistorical  = await db.historical_records.toArray();
      const exHistByUid   = new Map(exHistorical.filter(r => r.uid).map(r => [r.uid, r]));
      const exHistByKey   = new Map(exHistorical.map(r => [`${r.team_id}|${nkHistorical(r)}`, r]));
      for (const rec of data.historical_records) {
        const exTeamId = teamMap.get(rec.team_id);
        if (exTeamId == null) continue;
        const ex = pickExisting(rec, exHistByUid, exHistByKey, `${exTeamId}|${nkHistorical(rec)}`);
        if (ex) {
          if (isNewer(rec, ex)) {
            const { id: _, team_id: __, ...fields } = rec;
            await db.historical_records.update(ex.id, fields);
          }
          continue;
        }
        const { id: _, team_id: __, ...rest } = rec;
        const newId = await db.historical_records.add({ ...rest, team_id: exTeamId });
        exHistByKey.set(`${exTeamId}|${nkHistorical(rec)}`, { ...rest, id: newId, team_id: exTeamId });
      }
    }

    // ── 8. Tourney entries ─────────────────────────────────────────────────
    if (Array.isArray(data.tourney_entries)) {
      const exTourneys    = await db.tourney_entries.toArray();
      const exTourneyByUid = new Map(exTourneys.filter(t => t.uid).map(t => [t.uid, t]));
      const exTourneyByKey = new Map(exTourneys.map(t => [`${t.team_id}|${nkTourney(t)}`, t]));
      for (const t of data.tourney_entries) {
        const exTeamId = teamMap.get(t.team_id);
        if (exTeamId == null) continue;
        const ex = pickExisting(t, exTourneyByUid, exTourneyByKey, `${exTeamId}|${nkTourney(t)}`);
        if (ex) {
          if (isNewer(t, ex)) {
            const { id: _, team_id: __, ...fields } = t;
            await db.tourney_entries.update(ex.id, fields);
          }
          continue;
        }
        const { id: _, team_id: __, ...rest } = t;
        const newId = await db.tourney_entries.add({ ...rest, team_id: exTeamId });
        exTourneyByKey.set(`${exTeamId}|${nkTourney(t)}`, { ...rest, id: newId, team_id: exTeamId });
      }
    }

    // ── 9. Season history ──────────────────────────────────────────────────
    if (Array.isArray(data.season_history)) {
      const exSeasonHist      = await db.season_history.toArray();
      const exSeasonHistByUid = new Map(exSeasonHist.filter(h => h.uid).map(h => [h.uid, h]));
      const exSeasonHistByKey = new Map(exSeasonHist.map(h => [`${h.team_id}|${nkSeasonHist(h)}`, h]));
      for (const h of data.season_history) {
        const exTeamId = teamMap.get(h.team_id);
        if (exTeamId == null) continue;
        const ex = pickExisting(h, exSeasonHistByUid, exSeasonHistByKey, `${exTeamId}|${nkSeasonHist(h)}`);
        if (ex) {
          if (isNewer(h, ex)) {
            const { id: _, team_id: __, ...fields } = h;
            await db.season_history.update(ex.id, fields);
          }
          continue;
        }
        const { id: _, team_id: __, ...rest } = h;
        const newId = await db.season_history.add({ ...rest, team_id: exTeamId });
        exSeasonHistByKey.set(`${exTeamId}|${nkSeasonHist(h)}`, { ...rest, id: newId, team_id: exTeamId });
      }
    }

    // ── 10. Player commits ─────────────────────────────────────────────────
    if (Array.isArray(data.player_commits)) {
      const exCommits      = await db.player_commits.toArray();
      const exCommitByUid  = new Map(exCommits.filter(c => c.uid).map(c => [c.uid, c]));
      const exCommitByKey  = new Map(exCommits.map(c => [`${c.team_id}|${nkCommit(c)}`, c]));
      for (const c of data.player_commits) {
        const exTeamId = teamMap.get(c.team_id);
        if (exTeamId == null) continue;
        const ex = pickExisting(c, exCommitByUid, exCommitByKey, `${exTeamId}|${nkCommit(c)}`);
        if (ex) {
          if (isNewer(c, ex)) {
            const { id: _, team_id: __, ...fields } = c;
            await db.player_commits.update(ex.id, fields);
          }
          continue;
        }
        const { id: _, team_id: __, ...rest } = c;
        const newId = await db.player_commits.add({ ...rest, team_id: exTeamId });
        exCommitByKey.set(`${exTeamId}|${nkCommit(c)}`, { ...rest, id: newId, team_id: exTeamId });
      }
    }

    // ── 11. Accolade types ─────────────────────────────────────────────────
    // Winners reference type_id, so build an imported→db type-id map first.
    const accoladeTypeMap = new Map();
    if (Array.isArray(data.accolade_types)) {
      const exTypes     = await db.accolade_types.toArray();
      const exTypeByUid = new Map(exTypes.filter(t => t.uid).map(t => [t.uid, t]));
      const exTypeByKey = new Map(exTypes.map(t => [`${t.team_id}|${nkAccType(t)}`, t]));
      for (const t of data.accolade_types) {
        const exTeamId = teamMap.get(t.team_id);
        if (exTeamId == null) continue;
        const ex = pickExisting(t, exTypeByUid, exTypeByKey, `${exTeamId}|${nkAccType(t)}`);
        if (ex) {
          accoladeTypeMap.set(t.id, ex.id);
          if (isNewer(t, ex)) {
            const { id: _, team_id: __, ...fields } = t;
            await db.accolade_types.update(ex.id, fields);
          }
          continue;
        }
        const { id: _, team_id: __, ...rest } = t;
        const newId = await db.accolade_types.add({ ...rest, team_id: exTeamId });
        accoladeTypeMap.set(t.id, newId);
        exTypeByKey.set(`${exTeamId}|${nkAccType(t)}`, { ...rest, id: newId, team_id: exTeamId });
      }
    }

    // ── 12. Accolade winners ───────────────────────────────────────────────
    if (Array.isArray(data.accolade_winners)) {
      const exWinners     = await db.accolade_winners.toArray();
      const exWinnerByUid = new Map(exWinners.filter(w => w.uid).map(w => [w.uid, w]));
      const exWinnerByKey = new Map(exWinners.map(w => [`${w.type_id}|${nkAccWinner(w)}`, w]));
      for (const w of data.accolade_winners) {
        const exTeamId = teamMap.get(w.team_id);
        const exTypeId = accoladeTypeMap.get(w.type_id);
        if (exTeamId == null || exTypeId == null) continue;
        const ex = pickExisting(w, exWinnerByUid, exWinnerByKey, `${exTypeId}|${nkAccWinner(w)}`);
        if (ex) {
          if (isNewer(w, ex)) {
            // type_id is set explicitly (not spread from `w`) — a coach may have
            // reassigned this winner to a different award, and `w.type_id` is
            // the *imported* device's local id, not ours; exTypeId is already
            // resolved through accoladeTypeMap above.
            const { id: _, team_id: __, type_id: ___, ...fields } = w;
            await db.accolade_winners.update(ex.id, { ...fields, type_id: exTypeId });
          }
          continue;
        }
        const { id: _, team_id: __, type_id: ___, ...rest } = w;
        const newId = await db.accolade_winners.add({ ...rest, team_id: exTeamId, type_id: exTypeId });
        exWinnerByKey.set(`${exTypeId}|${nkAccWinner(w)}`, { ...rest, id: newId, team_id: exTeamId, type_id: exTypeId });
      }
    }

    // ── 13. Saved lineups ──────────────────────────────────────────────────
    // Previously never merged at all — a lineup template saved on one device
    // never reached any other device syncing the same account. Player ids
    // embedded in serve_order/libero slots need remapping through playerMap,
    // the same way dedupe.js's mergePlayerGroup remaps them when merging
    // duplicate players (serve_order entries are stored as strings there too).
    if (Array.isArray(data.saved_lineups)) {
      const exLineups      = await db.saved_lineups.toArray();
      const exLineupByUid  = new Map(exLineups.filter(l => l.uid).map(l => [l.uid, l]));
      const exLineupByKey  = new Map(exLineups.map(l => [`${l.team_id}|${nkSavedLineup(l)}`, l]));
      const remapPlayerIds = (l) => ({
        ...l,
        serve_order:       (l.serve_order ?? []).map(id => playerMap.get(Number(id)) ?? id),
        libero_player_id:  l.libero_player_id  != null ? (playerMap.get(Number(l.libero_player_id))  ?? null) : null,
        libero2_player_id: l.libero2_player_id != null ? (playerMap.get(Number(l.libero2_player_id)) ?? null) : null,
      });
      for (const l of data.saved_lineups) {
        const exTeamId = teamMap.get(l.team_id);
        if (exTeamId == null) continue;
        const ex = pickExisting(l, exLineupByUid, exLineupByKey, `${exTeamId}|${nkSavedLineup(l)}`);
        if (ex) {
          if (isNewer(l, ex)) {
            const { id: _, team_id: __, ...fields } = remapPlayerIds(l);
            await db.saved_lineups.update(ex.id, fields);
          }
          continue;
        }
        const { id: _, team_id: __, ...rest } = remapPlayerIds(l);
        const newId = await db.saved_lineups.add({ ...rest, team_id: exTeamId });
        exLineupByKey.set(`${exTeamId}|${nkSavedLineup(l)}`, { ...rest, id: newId, team_id: exTeamId });
      }
    }

    // ── 14. Practice sessions ────────────────────────────────────────────
    // Previously never merged — logged only on the device that ran the drill.
    // `date` is a full timestamp set once at creation (not user-typed), so it
    // already uniquely identifies a session; `archived` is the only thing
    // edited afterward, which isNewer/update below now actually propagates.
    // team_id can be null (a session not tied to a specific team).
    if (Array.isArray(data.practice_sessions)) {
      const exSessions      = await db.practice_sessions.toArray();
      const exSessionByUid  = new Map(exSessions.filter(p => p.uid).map(p => [p.uid, p]));
      const exSessionByKey  = new Map(exSessions.map(p => [`${p.team_id ?? ''}|${nkPractice(p)}`, p]));
      for (const p of data.practice_sessions) {
        let exTeamId = null;
        if (p.team_id != null) {
          exTeamId = teamMap.get(p.team_id);
          if (exTeamId == null) continue;
        }
        const key = `${exTeamId ?? ''}|${nkPractice(p)}`;
        const ex = pickExisting(p, exSessionByUid, exSessionByKey, key);
        if (ex) {
          if (isNewer(p, ex)) {
            const { id: _, team_id: __, ...fields } = p;
            await db.practice_sessions.update(ex.id, fields);
          }
          continue;
        }
        const { id: _, team_id: __, ...rest } = p;
        const newId = await db.practice_sessions.add({ ...rest, team_id: exTeamId });
        exSessionByKey.set(key, { ...rest, id: newId, team_id: exTeamId });
      }
    }

  });

  return { matchesAdded, matchesReplaced, matchesSkipped, matchesTombstoned };
}

// ── Placeholder dedup ─────────────────────────────────────────────────────────
// Fold duplicate / left-over "scheduled" placeholder matches into the single
// real game they represent. Safe to call after any merge or restore: it only
// ever deletes a match whose status is "scheduled" AND which has zero recorded
// stats (see stats/matchIdentity.js for the reasoning and safety guarantees).
// Runs on every device after a sync and is fully deterministic, so no tombstone
// is needed — each device removes the same rows on its own. Returns the number
// of placeholder rows removed.
export async function dedupeLocalMatches() {
  const [matches, sets, contacts] = await Promise.all([
    db.matches.toArray(),
    db.sets.toArray(),
    db.contacts.toArray(),
  ]);

  const withStats = new Set();
  for (const s of sets)     withStats.add(s.match_id);
  for (const c of contacts) withStats.add(c.match_id);

  const { deletions } = planMatchDedup(matches, (id) => withStats.has(id));
  if (!deletions.length) return 0;

  await db.transaction('rw', db.tables, async () => {
    for (const { loserId } of deletions) {
      // Cascade-delete exactly like deleteMatch()/cascadeDeleteMatchRow() —
      // a placeholder normally has no children, but stay defensive.
      const exSets   = await db.sets.where('match_id').equals(loserId).toArray();
      const exSetIds = exSets.map((s) => s.id);
      await db.contacts.where('match_id').equals(loserId).delete();
      if (exSetIds.length) {
        await db.rallies.where('set_id').anyOf(exSetIds).delete();
        await db.lineups.where('set_id').anyOf(exSetIds).delete();
        await db.substitutions.where('set_id').anyOf(exSetIds).delete();
      }
      await db.sets.where('match_id').equals(loserId).delete();
      await db.matches.delete(loserId);
    }
  });

  return deletions.length;
}
