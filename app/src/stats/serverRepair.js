// One-time repair for `rally.server_player_id` (drives SRV PT / ATT:PT).
//
// Two ways that field goes bad:
//   1. It was never recorded — roughly half of older / box-score-entered
//      rallies have it null.
//   2. A sync before stats/merge.js learned to translate it (fixed 2026-08-30)
//      left it pointing at the *other* device's player id — an orphan here.
//
// The fix: a serve the coach logged is a `contacts` row with action "serve",
// its own `rotation_num`, and a `player_id` that DID get translated on sync.
// Walk each set's "we served" rallies in order alongside its serve contacts,
// pairing a broken rally with the next serve contact that shares its rotation
// (and is close in time), and adopt that contact's player as the server.
//
// SAFETY: a rally whose server_player_id already points at a real local player
// is never rewritten — only nulls and orphans are filled. So a rally that reads
// correctly today cannot be made wrong; the worst case is a broken rally we
// can't pair with a contact, which stays exactly as broken as it is now.

// How far after a rally's timestamp a serve contact can still belong to it.
// Serves are logged within a second or two of the point; 8s is slack for a
// slow tap without reaching into the next rotation's serves.
const DEFAULT_WINDOW_MS = 8000;

const byTimeThenId = (a, b) =>
  (a.timestamp ?? 0) - (b.timestamp ?? 0) || (a.id ?? 0) - (b.id ?? 0);

function groupBySet(rows) {
  const map = new Map();
  for (const r of rows) {
    const k = r.set_id;
    const list = map.get(k);
    if (list) list.push(r);
    else map.set(k, [r]);
  }
  return map;
}

/**
 * @param rallies         all rally rows
 * @param serveContacts   contacts rows with action === 'serve' (extra rows are
 *                        filtered here, so passing the whole contacts table is
 *                        fine too)
 * @param validPlayerIds  Set of this device's player ids
 * @returns Array<{ id, server_player_id }> — rallies to update, in id order
 */
export function planServerRepair(rallies, serveContacts, validPlayerIds, { windowMs = DEFAULT_WINDOW_MS } = {}) {
  const usableContacts = serveContacts.filter(c =>
    c.action === 'serve' &&
    c.serve_side !== 'them' &&
    validPlayerIds.has(c.player_id),
  );

  const contactsBySet = groupBySet(usableContacts);
  for (const list of contactsBySet.values()) list.sort(byTimeThenId);

  const ralliesBySet = groupBySet(rallies);
  const updates = [];

  for (const [setId, setRallies] of ralliesBySet) {
    const contacts = contactsBySet.get(setId) ?? [];
    const usServes = setRallies
      .filter(r => r.serve_side === 'us')
      .sort(byTimeThenId);

    let ci = 0; // cursor into `contacts`, only moves forward

    for (const rally of usServes) {
      // First unconsumed serve contact in this rally's rotation, close in time.
      let pick = -1;
      for (let j = ci; j < contacts.length; j++) {
        const c = contacts[j];
        if ((c.timestamp ?? 0) > (rally.timestamp ?? 0) + windowMs) break;
        if (c.rotation_num === rally.our_rotation) { pick = j; break; }
      }
      if (pick === -1) continue;

      // Consume it whether or not we write — keeps the two sequences aligned
      // for the rallies that follow.
      ci = pick + 1;

      if (validPlayerIds.has(rally.server_player_id)) continue; // already fine
      const serverId = contacts[pick].player_id;
      if (serverId === rally.server_player_id) continue;
      updates.push({ id: rally.id, server_player_id: serverId });
    }
  }

  updates.sort((a, b) => a.id - b.id);
  return updates;
}

/**
 * Run the repair inside a Dexie transaction (schema upgrade or a manual
 * "recompute" action). Returns { scanned, updated }.
 */
export async function repairServerPlayerIds(tx) {
  const [players, rallies, serveContacts] = await Promise.all([
    tx.table('players').toArray(),
    tx.table('rallies').toArray(),
    tx.table('contacts').where('action').equals('serve').toArray(),
  ]);

  const validPlayerIds = new Set(players.map(p => p.id));
  const updates = planServerRepair(rallies, serveContacts, validPlayerIds);

  if (updates.length) {
    await tx.table('rallies').bulkUpdate(
      updates.map(u => ({ key: u.id, changes: { server_player_id: u.server_player_id } })),
    );
  }

  return { scanned: rallies.length, updated: updates.length };
}
