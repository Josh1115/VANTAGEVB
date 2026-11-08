// Pulls every all-time top-10 entry that happened in one season, for the
// "Records Set" box on the History page's season cards.

export const SEASON_RECORD_GROUPS = [
  { tab: 'match',       label: 'Match' },
  { tab: 'season',      label: 'Season' },
  { tab: 'team_match',  label: 'Team Match' },
  { tab: 'team_season', label: 'Team Season' },
  { tab: 'career',      label: 'Career' },
];

// Only these count stats are listed (no rate stats like HIT%/ACE%, no sets played).
export const SEASON_RECORD_STATS = new Set(['k', 'blk', 'dig', 'ast', 'ace']);

// Which season a records row belongs to. Career rows count in the player's
// final season; hand-entered match rows with no season fall back to the date's year.
export function rowYear(tab, row) {
  if (tab === 'career') return row.career_year_end ?? null;
  if (row.year != null && row.year !== '') return row.year;
  if ((tab === 'match' || tab === 'team_match') && row.date) return String(row.date).slice(0, 4);
  return null;
}

/**
 * boards: { [tab]: { [statKey]: rows[] } } from computeLeaderboards.
 * statDefs: { [tab]: [{ key, label, fmt }] } — the order stats are listed in.
 * Returns [{ tab, label, items: [{ rank, name, label, value, opp, key }] }],
 * only groups with entries, each sorted by rank then stat order.
 */
export function recordsForYear(boards, year, statDefs) {
  if (!boards || year == null) return [];
  const y = String(year);
  const groups = [];
  for (const { tab, label } of SEASON_RECORD_GROUPS) {
    const defs = (statDefs?.[tab] ?? []).filter(d => SEASON_RECORD_STATS.has(d.key));
    const items = [];
    defs.forEach((def, order) => {
      for (const row of boards[tab]?.[def.key] ?? []) {
        const ry = rowYear(tab, row);
        if (ry == null || String(ry) !== y) continue;
        items.push({
          key:   `${tab}-${def.key}-${row.rank}`,
          rank:  row.rank,
          name:  tab.startsWith('team_') ? null : (row.name || '?'),
          label: def.label,
          value: def.fmt ? def.fmt(row.val) : String(row.val),
          opp:   tab === 'match' || tab === 'team_match' ? (row.opp || null) : null,
          order,
        });
      }
    });
    if (!items.length) continue;
    items.sort((a, b) => a.rank - b.rank || a.order - b.order);
    groups.push({ tab, label, items });
  }
  return groups;
}
