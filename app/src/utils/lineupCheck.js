// Spots a broken on-court lineup (same player in two slots, or not exactly six
// slots) so the live screen can warn the coach instead of silently showing
// a wrong court. Returns null when the lineup is fine.
export function findLineupProblem(lineup) {
  if (!Array.isArray(lineup) || !lineup.some((sl) => sl?.playerId)) return null;
  if (lineup.length !== 6) return { type: 'size', count: lineup.length };
  const seen = new Set();
  for (const sl of lineup) {
    if (!sl?.playerId) continue;
    if (seen.has(sl.playerId)) return { type: 'duplicate', playerId: sl.playerId, name: sl.playerName ?? '', jersey: sl.jersey ?? '' };
    seen.add(sl.playerId);
  }
  return null;
}
