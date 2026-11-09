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

// Player tabs only (team records don't belong to one player).
const PLAYER_RECORD_TABS = ['match', 'season', 'career'];

/**
 * Every all-time top-10 spot one player holds, for the medals on their
 * profile's Awards tab. Matches by name (same as awards). Same boards/statDefs
 * shapes as recordsForYear. Returns [{ key, tab, tabLabel, rank, label, value, year, opp }]
 * sorted best rank first, then Match → Season → Career, then stat order.
 */
export function recordsForPlayer(boards, playerName, statDefs) {
  const name = playerName?.trim().toLowerCase();
  if (!boards || !name) return [];
  const items = [];
  PLAYER_RECORD_TABS.forEach((tab, tabOrder) => {
    const tabLabel = SEASON_RECORD_GROUPS.find(g => g.tab === tab)?.label ?? tab;
    const defs = (statDefs?.[tab] ?? []).filter(d => SEASON_RECORD_STATS.has(d.key));
    defs.forEach((def, order) => {
      for (const row of boards[tab]?.[def.key] ?? []) {
        if (row.name?.trim().toLowerCase() !== name) continue;
        items.push({
          key:   `${tab}-${def.key}-${row.rank}`,
          tab, tabLabel,
          rank:  row.rank,
          label: def.label,
          value: def.fmt ? def.fmt(row.val) : String(row.val),
          year:  rowYear(tab, row),
          opp:   tab === 'match' ? (row.opp || null) : null,
          tabOrder, order,
        });
      }
    });
  });
  return items.sort((a, b) => a.rank - b.rank || a.tabOrder - b.tabOrder || a.order - b.order);
}

// Volleyball "double-double" / "triple-double": 10+ in two / three of these
// count stats in one match (like basketball). Blocks can be halves (assists).
export const DOUBLE_STATS = ['k', 'ace', 'blk', 'ast', 'dig'];

/**
 * lines: [{ stats: { k, ace, blk, ast, dig } }] — one per match.
 * Returns { doubles, triples, byStat }: matches with 2+ / 3+ categories at 10+
 * (a triple-double is also a double-double), and byStat = { k, ace, blk, ast, dig }:
 * how many matches had 10+ in that one stat.
 */
export function countDoubles(lines) {
  let doubles = 0, triples = 0;
  const byStat = Object.fromEntries(DOUBLE_STATS.map(k => [k, 0]));
  for (const { stats } of lines ?? []) {
    const hitKeys = DOUBLE_STATS.filter(k => (stats?.[k] ?? 0) >= 10);
    hitKeys.forEach(k => { byStat[k]++; });
    const hits = hitKeys.length;
    if (hits >= 2) doubles++;
    if (hits >= 3) triples++;
  }
  return { doubles, triples, byStat };
}
