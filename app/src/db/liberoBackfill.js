import { db } from './schema';

// One-time migration: backfill player_in / in_position_label on historical libero_swap
// substitution rows recorded before the fix that made swapLibero() save them.
// Those old rows only had { set_id, rally_number, libero_swap: true, timestamp } — no
// record of who the libero was or that they were playing "L" — so
// getPlayerPositionsForMatches() found nothing for those appearances, and every
// libero's VER silently fell back to the default 1.0 position multiplier instead of
// their real one.
//
// This only backfills the "swap in" side (the libero entering the court). The "swap
// out" side (the original back-row player returning) isn't touched — reconstructing
// exactly who that was and what slot they returned to isn't reliably recoverable from
// the old rows, and it isn't needed anyway: that player already has other correctly
// tagged appearances (starting lineups, normal substitutions), so their overall
// position tally isn't affected the way the libero's is.
const BACKFILL_KEY = 'vbstat_libero_backfill_done';

export async function backfillLiberoSwapPositions() {
  try {
    if (localStorage.getItem(BACKFILL_KEY)) return;

    const sets = await db.sets.toArray();
    const liberoSets = sets.filter(s => s.libero_player_id);
    if (!liberoSets.length) {
      localStorage.setItem(BACKFILL_KEY, '1');
      return;
    }

    const updates = [];

    for (const set of liberoSets) {
      const liberoId = set.libero_player_id;

      const [subs, lineupRows] = await Promise.all([
        db.substitutions.where('set_id').equals(set.id).toArray(),
        db.lineups.where('set_id').equals(set.id).toArray(),
      ]);

      const brokenSwaps = subs
        .filter(r => r.libero_swap === true && !r.in_position_label)
        .sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0));
      if (!brokenSwaps.length) continue;

      // If the libero was already in the starting lineup, the first swap event in
      // the set must be them leaving ("out"); otherwise the first event is them
      // entering ("in"). Alternates from there.
      const startedOnCourt = lineupRows.some(r => r.player_id === liberoId);
      let isSwapIn = !startedOnCourt;

      for (const row of brokenSwaps) {
        if (isSwapIn) {
          updates.push({ id: row.id, player_in: liberoId, in_position_label: 'L' });
        }
        isSwapIn = !isSwapIn;
      }
    }

    if (updates.length) {
      await db.transaction('rw', db.substitutions, async () => {
        for (const u of updates) {
          await db.substitutions.update(u.id, { player_in: u.player_in, in_position_label: u.in_position_label });
        }
      });
    }

    localStorage.setItem(BACKFILL_KEY, '1');
  } catch {
    // Non-fatal — if this fails, historical libero appearances keep falling back to
    // the default position multiplier, but the app still works. Not retried until
    // the flag is manually cleared.
  }
}
