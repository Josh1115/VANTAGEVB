// Pure helpers for the dashboard season box.

const isWin = (m) => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0);

// Sort matches by date, breaking same-day ties with match_time ("HH:MM" 24h). No time = sorts last within the day.
export function sortByDateTime(a, b) {
  const da    = a.date?.slice(0, 10) ?? '';
  const dateB = b.date?.slice(0, 10) ?? '';
  if (da !== dateB) return da < dateB ? -1 : 1;
  const ta = a.match_time ?? '99:99';
  const tb = b.match_time ?? '99:99';
  return ta < tb ? -1 : ta > tb ? 1 : 0;
}

// Current streak from completed matches: { win, count } or null if none played.
export function currentStreak(completed) {
  const byNewest = [...completed].sort(sortByDateTime).reverse();
  if (!byNewest.length) return null;
  const win = isWin(byNewest[0]);
  let count = 0;
  for (const m of byNewest) { if (isWin(m) === win) count++; else break; }
  return { win, count };
}

// Earliest not-yet-played match with a date, or null.
export function seasonOpener(allMatches, completeStatus) {
  return allMatches
    .filter((m) => m.status !== completeStatus && m.date)
    .sort((a, b) => new Date(a.date) - new Date(b.date))[0] ?? null;
}
