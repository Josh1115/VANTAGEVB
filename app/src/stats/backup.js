import { db } from '../db/schema';
import { STORAGE_KEYS } from '../utils/storage';
import { supabase } from '../utils/supabase';
import { parseMergePreviewFromData, executeMerge, tombstoneKeyForMatch } from './merge';
import { deleteMatch } from './queries';

const BACKUP_VERSION = 1;

// Tables that must exist in every backup (present since v1)
const REQUIRED_TABLES = [
  'organizations', 'teams', 'seasons', 'players', 'opponents',
  'matches', 'sets', 'lineups', 'substitutions', 'rallies', 'contacts',
];

// Tables added in later schema versions; absent in older backups → treated as empty
const OPTIONAL_TABLES = [
  'saved_lineups', 'records', 'practice_sessions',
  'opp_tendencies', 'timeouts', 'historical_records', 'season_history',
  'tourney_entries', 'player_commits', 'accolade_types', 'accolade_winners',
  'tombstones',
];

const ALL_TABLES = [...REQUIRED_TABLES, ...OPTIONAL_TABLES];

// localStorage keys included in the backup. Account credentials are never
// exported so a shared backup file can't be used to hijack another coach's account.
const BLOCKED_SETTINGS_KEYS = new Set([
  STORAGE_KEYS.ACCOUNT_TOKEN,
  STORAGE_KEYS.ACCOUNT_EMAIL,
]);
const SETTINGS_KEYS = Object.values(STORAGE_KEYS).filter((k) => !BLOCKED_SETTINGS_KEYS.has(k));

// ── Migration ──────────────────────────────────────────────────────────────────
// Add cases here as BACKUP_VERSION increases.
function migrateBackup(data) {
  const v = data.version ?? 0;
  if (v > BACKUP_VERSION) {
    throw new Error(
      `This backup was created with a newer version of the app (v${v}). ` +
      `Please update the app before importing.`
    );
  }
  // v1 → current: nothing to migrate yet; future versions go here as:
  //   if (v < 2) { data.newField = data.newField ?? defaultValue; data.version = 2; }
  return data;
}

// ── Shared helpers ─────────────────────────────────────────────────────────────

async function collectBackupData() {
  const data = { version: BACKUP_VERSION, exportedAt: new Date().toISOString() };
  for (const table of ALL_TABLES) {
    data[table] = await db[table].toArray();
  }
  const settings = {};
  for (const key of SETTINGS_KEYS) {
    const v = localStorage.getItem(key);
    if (v !== null) settings[key] = v;
  }
  data.settings = settings;
  return data;
}

async function applyBackupData(data) {
  // Full restore/import replaces every table wholesale — capture this device's
  // own deletion history first so it survives the wipe even if the incoming
  // payload predates it and doesn't know about it yet.
  const localTombstones = await db.tombstones.toArray();

  await db.transaction('rw', db.tables, async () => {
    for (const table of [...ALL_TABLES].reverse()) {
      await db[table].clear();
    }
    for (const table of ALL_TABLES) {
      const rows = data[table];
      if (Array.isArray(rows) && rows.length > 0) {
        await db[table].bulkAdd(rows);
      }
    }
    for (const t of localTombstones) {
      const exists = await db.tombstones.where('[type+key]').equals([t.type, t.key]).first();
      if (!exists) await db.tombstones.add({ type: t.type, key: t.key, deleted_at: t.deleted_at });
    }
  });

  // Now that every known deletion (local + incoming) is recorded, remove any
  // match the payload brought back that this device had already deleted.
  await removeTombstonedMatches();

  if (data.settings && typeof data.settings === 'object') {
    for (const [key, value] of Object.entries(data.settings)) {
      if (typeof value === 'string' && !BLOCKED_SETTINGS_KEYS.has(key)) localStorage.setItem(key, value);
    }
  }
}

async function removeTombstonedMatches() {
  const tombstones = await db.tombstones.where('type').equals('match').toArray();
  if (!tombstones.length) return;
  const tombstoneSet = new Set(tombstones.map(t => t.key));

  const [orgs, teams, seasons, matches] = await Promise.all([
    db.organizations.toArray(), db.teams.toArray(), db.seasons.toArray(), db.matches.toArray(),
  ]);
  const orgById    = new Map(orgs.map(o => [o.id, o]));
  const teamById   = new Map(teams.map(t => [t.id, t]));
  const seasonById = new Map(seasons.map(s => [s.id, s]));

  for (const m of matches) {
    const season = seasonById.get(m.season_id);
    const team   = season ? teamById.get(season.team_id) : null;
    const org    = team ? orgById.get(team.org_id) : null;
    if (!season || !team || !org) continue;
    const key = tombstoneKeyForMatch(org.name, team, season.year, m);
    if (tombstoneSet.has(key)) await deleteMatch(m.id);
  }
}

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportBackup() {
  const data = await collectBackupData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vantage-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Auto-save ─────────────────────────────────────────────────────────────────

const MAX_AUTO_BACKUPS = 5;

export async function autoSaveBackup(label = 'auto', { session, teamsAllowed, matchLimit, isMaster } = {}) {
  const data = await collectBackupData();
  await db.auto_backups.add({ created_at: new Date().toISOString(), label, data });

  const all = await db.auto_backups.orderBy('created_at').toArray();
  if (all.length > MAX_AUTO_BACKUPS) {
    const toDelete = all.slice(0, all.length - MAX_AUTO_BACKUPS).map((b) => b.id);
    await db.auto_backups.bulkDelete(toDelete);
  }

  syncWithCloud(supabase, session, { teamsAllowed, matchLimit, isMaster }).catch(() => {});
}

export async function restoreAutoBackup(backupId, { teamsAllowed = Infinity, matchLimit = Infinity } = {}) {
  const backup = await db.auto_backups.get(backupId);
  if (!backup) throw new Error('Auto-backup not found.');
  let data = migrateBackup({ ...backup.data });

  const missingTables = REQUIRED_TABLES.filter((t) => !Array.isArray(data[t]));
  if (missingTables.length > 0) {
    throw new Error(`Backup is missing required tables: ${missingTables.join(', ')}`);
  }

  const backupTeamCount  = Array.isArray(data.teams)   ? data.teams.length   : 0;
  const backupMatchCount = Array.isArray(data.matches)  ? data.matches.length : 0;
  if (teamsAllowed < 99 && backupTeamCount > teamsAllowed) {
    throw new Error(`Backup has ${backupTeamCount} teams but your plan allows ${teamsAllowed}. Upgrade before restoring.`);
  }
  if (isFinite(matchLimit) && backupMatchCount > matchLimit) {
    throw new Error(`Backup has ${backupMatchCount} matches but your plan allows ${matchLimit}. Upgrade before restoring.`);
  }

  const tablesForTx = db.tables.filter((t) => t.name !== 'auto_backups');
  await db.transaction('rw', tablesForTx, async () => {
    for (const table of [...ALL_TABLES].reverse()) {
      await db[table].clear();
    }
    for (const table of ALL_TABLES) {
      const rows = data[table];
      if (Array.isArray(rows) && rows.length > 0) {
        await db[table].bulkAdd(rows);
      }
    }
  });

  if (data.settings && typeof data.settings === 'object') {
    for (const [key, value] of Object.entries(data.settings)) {
      if (typeof value === 'string' && !BLOCKED_SETTINGS_KEYS.has(key)) localStorage.setItem(key, value);
    }
  }
}

// ── Import ────────────────────────────────────────────────────────────────────

export async function importBackup(file, { teamsAllowed = Infinity, matchLimit = Infinity } = {}) {
  if (file.size > 50 * 1024 * 1024) {
    throw new Error('Backup file is too large (max 50 MB). Export a fresh backup and try again.');
  }
  const text = await file.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid file — could not parse JSON.');
  }

  if (!data.version) {
    throw new Error('Invalid backup: missing version field.');
  }

  data = migrateBackup(data);

  const missingTables = REQUIRED_TABLES.filter((t) => !Array.isArray(data[t]));
  if (missingTables.length > 0) {
    throw new Error(`Invalid backup: missing required tables: ${missingTables.join(', ')}`);
  }

  const backupTeamCount  = Array.isArray(data.teams)   ? data.teams.length   : 0;
  const backupMatchCount = Array.isArray(data.matches)  ? data.matches.length : 0;
  if (teamsAllowed < 99 && backupTeamCount > teamsAllowed) {
    throw new Error(`Backup has ${backupTeamCount} teams but your plan allows ${teamsAllowed}. Upgrade before importing.`);
  }
  if (isFinite(matchLimit) && backupMatchCount > matchLimit) {
    throw new Error(`Backup has ${backupMatchCount} matches but your plan allows ${matchLimit} per season. Upgrade before importing.`);
  }

  await applyBackupData(data);
}

// ── Cloud sync ────────────────────────────────────────────────────────────────

export async function saveToCloud(supabase, session) {
  const user = session?.user;
  if (!user) throw new Error('Not signed in');
  const payload = await collectBackupData();
  const { error } = await supabase
    .from('backups')
    .upsert(
      { user_id: user.id, label: 'manual', payload, created_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

export async function restoreFromCloud(supabase, { teamsAllowed = Infinity, matchLimit = Infinity, session } = {}) {
  const user = session?.user;
  if (!user) throw new Error('Not signed in');
  const { data, error } = await supabase
    .from('backups')
    .select('payload, created_at')
    .eq('user_id', user.id)
    .single();
  if (error) throw error;
  let payload = migrateBackup(data.payload);
  const missingTables = REQUIRED_TABLES.filter((t) => !Array.isArray(payload[t]));
  if (missingTables.length > 0) {
    throw new Error(`Cloud backup is missing required tables: ${missingTables.join(', ')}`);
  }

  const backupTeamCount  = Array.isArray(payload.teams)   ? payload.teams.length   : 0;
  const backupMatchCount = Array.isArray(payload.matches)  ? payload.matches.length : 0;
  if (teamsAllowed < 99 && backupTeamCount > teamsAllowed) {
    throw new Error(`Cloud backup has ${backupTeamCount} teams but your plan allows ${teamsAllowed}. Upgrade before restoring.`);
  }
  if (isFinite(matchLimit) && backupMatchCount > matchLimit) {
    throw new Error(`Cloud backup has ${backupMatchCount} matches but your plan allows ${matchLimit}. Upgrade before restoring.`);
  }

  await applyBackupData(payload);

  // Sync the server-side match counter so trial limits reflect restored data
  await supabase
    .from('profiles')
    .update({ matches_created: backupMatchCount })
    .eq('id', user.id);
}

// Merge the cloud backup into this device (never deleting local rows), then push the
// combined result back up. Used instead of a plain overwrite so two coaches signed into
// the same account on different devices (e.g. Varsity + JV) don't erase each other's data
// when they sync — each device's new/unique records are additive, matched by team/season/
// opponent/date rather than by row id, so two different games are always kept as two rows.
export async function syncWithCloud(supabase, session, { teamsAllowed = Infinity, matchLimit = Infinity, isMaster = false } = {}) {
  const user = session?.user;
  if (!user) throw new Error('Not signed in');

  const localTeamCount = await db.teams.count();
  if (localTeamCount === 0) {
    // Nothing local to merge with — behave like a plain restore (respects plan limits).
    await restoreFromCloud(supabase, { session, teamsAllowed, matchLimit });
    return;
  }

  const { data: cloudRow, error } = await supabase
    .from('backups')
    .select('payload')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw error;

  if (cloudRow?.payload) {
    const cloudData = migrateBackup({ ...cloudRow.payload });
    const preview = await parseMergePreviewFromData(cloudData);
    if (preview.valid) {
      const decisions = {};
      // No one is present to resolve conflicts during an automatic sync — default to
      // keeping the local version so this can never silently overwrite a match someone
      // is actively scoring on this device. True same-game conflicts are rare (it would
      // take two devices editing the identical opponent/date/team) and can still be
      // resolved manually via Import & Merge.
      for (const c of preview.conflicts) decisions[c.importedId] = 'keep';
      await executeMerge(preview, decisions, { isMaster, matchLimit });
    }
  }

  await saveToCloud(supabase, session);
}

export async function getCloudBackupMeta(supabase, session) {
  const user = session?.user;
  if (!user) return null;
  const { data } = await supabase
    .from('backups')
    .select('created_at')
    .eq('user_id', user.id)
    .maybeSingle();
  return data?.created_at ?? null;
}
