import { db } from '../db/schema';

const BACKUP_VERSION = 1;

const TABLES = [
  'organizations', 'teams', 'seasons', 'players', 'opponents',
  'matches', 'sets', 'lineups', 'substitutions', 'rallies', 'contacts',
];

// ── Export ────────────────────────────────────────────────────────────────────

export async function exportBackup() {
  const data = { version: BACKUP_VERSION, exportedAt: new Date().toISOString() };
  for (const table of TABLES) {
    data[table] = await db[table].toArray();
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vbappv2-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
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

  if (!data.version || data.version !== BACKUP_VERSION) {
    throw new Error(`Unsupported backup version: ${data.version ?? 'missing'}`);
  }

  await db.transaction('rw', db.tables, async () => {
    // Clear all tables in reverse dependency order
    for (const table of [...TABLES].reverse()) {
      await db[table].clear();
    }
    // Bulk-insert preserving original IDs
    for (const table of TABLES) {
      if (Array.isArray(data[table]) && data[table].length > 0) {
        await db[table].bulkAdd(data[table]);
      }
    }
  });
}
