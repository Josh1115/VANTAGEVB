// Pure helpers for the dashboard season box.

const isWin = (m) => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0);

// Current streak from completed matches: { win, count } or null if none played.
export function currentStreak(completed) {
  const byNewest = [...completed].sort((a, b) => new Date(b.date) - new Date(a.date));
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
