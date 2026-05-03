import { db } from '../db/schema';
import { STORAGE_KEYS } from '../utils/storage';

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
  'tourney_entries', 'player_commits',
];

const ALL_TABLES = [...REQUIRED_TABLES, ...OPTIONAL_TABLES];

// localStorage keys to include in the backup. LAST_SET_SCORE is transient runtime state — excluded.
const SETTINGS_KEYS = Object.values(STORAGE_KEYS).filter((k) => k !== STORAGE_KEYS.LAST_SET_SCORE);

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

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportBackup() {
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

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vbappv2-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Auto-save ─────────────────────────────────────────────────────────────────

const MAX_AUTO_BACKUPS = 5;

export async function autoSaveBackup(label = 'auto') {
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

  await db.auto_backups.add({ created_at: new Date().toISOString(), label, data });

  const all = await db.auto_backups.orderBy('created_at').toArray();
  if (all.length > MAX_AUTO_BACKUPS) {
    const toDelete = all.slice(0, all.length - MAX_AUTO_BACKUPS).map((b) => b.id);
    await db.auto_backups.bulkDelete(toDelete);
  }
}

export async function restoreAutoBackup(backupId) {
  const backup = await db.auto_backups.get(backupId);
  if (!backup) throw new Error('Auto-backup not found.');
  let data = migrateBackup({ ...backup.data });

  const missingTables = REQUIRED_TABLES.filter((t) => !Array.isArray(data[t]));
  if (missingTables.length > 0) {
    throw new Error(`Backup is missing required tables: ${missingTables.join(', ')}`);
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
      if (typeof value === 'string') localStorage.setItem(key, value);
    }
  }
}

// ── Import ────────────────────────────────────────────────────────────────────

export async function importBackup(file) {
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

  await db.transaction('rw', db.tables, async () => {
    // Clear all tables in reverse dependency order
    for (const table of [...ALL_TABLES].reverse()) {
      await db[table].clear();
    }
    // Bulk-insert preserving original IDs; optional tables may be absent in older backups
    for (const table of ALL_TABLES) {
      const rows = data[table];
      if (Array.isArray(rows) && rows.length > 0) {
        await db[table].bulkAdd(rows);
      }
    }
  });

  // Restore settings to localStorage (after DB transaction succeeds)
  if (data.settings && typeof data.settings === 'object') {
    for (const [key, value] of Object.entries(data.settings)) {
      if (typeof value === 'string') localStorage.setItem(key, value);
    }
  }
}
