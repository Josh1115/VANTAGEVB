import { db } from '../db/schema';
import { MATCH_STATUS } from '../constants';

const PLAYOFF_ROUND_ORDER = [
  'regional', 'sectional', 'super-sectional', 'quarterfinal', 'semifinal', 'state championship',
];

function roundOrderIndex(roundName) {
  const lower = (roundName ?? '').toLowerCase();
  const exact = PLAYOFF_ROUND_ORDER.findIndex(r => lower === r);
  if (exact !== -1) return exact;
  return PLAYOFF_ROUND_ORDER.findIndex(r => lower.includes(r));
}

function inferFinishFromRounds(rounds) {
  if (!rounds?.length) return '';
  const sorted = [...rounds]
    .filter(r => r.round?.trim())
    .sort((a, b) => {
      const ai = roundOrderIndex(a.round);
      const bi = roundOrderIndex(b.round);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  const last = sorted[sorted.length - 1];
  if (!last?.round) return '';
  return last.result === 'W' ? `Won ${last.round}` : last.round;
}

// Called immediately when a season is ended. Infers playoff finish from match
// data and writes it to season_history if state_finish is not already set.
export async function applyInferredSeasonFinish(seasonId, teamId, year) {
  const matches = await db.matches
    .where('season_id').equals(seasonId)
    .filter(m => m.status === MATCH_STATUS.COMPLETE && m.match_type === 'ihsa-playoffs' && m.playoff_round)
    .toArray();

  if (!matches.length) return;

  const rounds = matches.map(m => ({
    round:  m.playoff_round,
    result: (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0) ? 'W' : 'L',
  }));

  const finish = inferFinishFromRounds(rounds);
  if (!finish) return;

  const existing = await db.season_history
    .where('team_id').equals(teamId)
    .filter(h => String(h.year) === String(year))
    .first();

  if (existing) {
    if (!existing.state_finish) {
      await db.season_history.update(existing.id, { state_finish: finish });
    }
  } else {
    await db.season_history.add({ team_id: teamId, year, state_finish: finish });
  }
}
