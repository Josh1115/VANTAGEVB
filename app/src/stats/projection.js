import { fmtBlocks, fmtCount } from './formatters';

// Below this many team matches a full-season projection is too noisy to show.
export const PROJECTION_MIN_MATCHES = 3;

// Counting stats scale with games played; rates / percentages / ratings do not.
// A stat column is a counting stat iff it renders as a plain integer.
export const isCountingCol = (col) => col.fmt === fmtCount || col.fmt === fmtBlocks;

// A "what this player is on pace for over a full season" row. Counting stats are
// scaled by `factor` (projected matches / team matches played so far); everything
// else (HIT%, APR, VER, per-set rates) is carried through unchanged. The `mp`
// column is pinned to the projected match count rather than scaled.
export function buildProjectedRow(playerRow, columns, factor, projectedMatches) {
  const out = { id: '__projected__' };
  for (const col of columns) {
    if (col.key === 'name') continue;
    if (col.key === 'mp') { out.mp = projectedMatches; continue; }
    const v = playerRow[col.key];
    out[col.key] = (isCountingCol(col) && typeof v === 'number') ? Math.round(v * factor) : v;
  }
  return out;
}

// Seasons remaining AFTER the current one, keyed by the player's school year.
// Anything else (blank, middle school, etc.) gets no career projection.
export const SEASONS_LEFT_BY_GRADE = { Freshman: 3, Sophomore: 2, Junior: 1, Senior: 0 };

// A "what this player is on pace for over their whole career" row: past-season
// totals plus this season's projected row repeated for this season and every
// season left. Counting stats (incl. `mp`) are summed; rates are carried through
// from the season projection unchanged.
export function buildCareerProjectedRow(pastRow, seasonProjRow, columns, seasonsLeft) {
  const out = { id: '__career_projected__' };
  for (const col of columns) {
    if (col.key === 'name') continue;
    const v = seasonProjRow[col.key];
    out[col.key] = ((col.key === 'mp' || isCountingCol(col)) && typeof v === 'number')
      ? Math.round((pastRow?.[col.key] ?? 0) + v * (1 + seasonsLeft))
      : v;
  }
  return out;
}
