import { db } from '../db/schema';
import { STORAGE_KEYS } from '../utils/storage';
import { supabase } from '../utils/supabase';

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
];

const ALL_TABLES = [...REQUIRED_TABLES, ...OPTIONAL_TABLES];

// localStorage keys included in the backup. LAST_SET_SCORE is transient; account credentials are
// never exported so a shared backup file can't be used to hijack another coach's account.
const BLOCKED_SETTINGS_KEYS = new Set([
  STORAGE_KEYS.LAST_SET_SCORE,
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
  });

  if (data.settings && typeof data.settings === 'object') {
    for (const [key, value] of Object.entries(data.settings)) {
      if (typeof value === 'string' && !BLOCKED_SETTINGS_KEYS.has(key)) localStorage.setItem(key, value);
    }
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

export async function autoSaveBackup(label = 'auto') {
  const data = await collectBackupData();
  await db.auto_backups.add({ created_at: new Date().toISOString(), label, data });

  const all = await db.auto_backups.orderBy('created_at').toArray();
  if (all.length > MAX_AUTO_BACKUPS) {
    const toDelete = all.slice(0, all.length - MAX_AUTO_BACKUPS).map((b) => b.id);
    await db.auto_backups.bulkDelete(toDelete);
  }

  saveToCloud(supabase).catch(() => {});
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
