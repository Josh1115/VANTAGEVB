import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { MATCH_STATUS } from '../constants';
import { fmtDate } from '../stats/formatters';
import { computeMatchStats } from '../stats/engine';
import { exportMaxPrepsCSV } from '../stats/export';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';

export function SeasonDetailPage() {
  const { seasonId } = useParams();
  const navigate = useNavigate();
  const id = Number(seasonId);

  const data = useLiveQuery(async () => {
    const season = await db.seasons.get(id);
    if (!season) return null;
    const team = await db.teams.get(season.team_id);
    const rawMatches = await db.matches.where('season_id').equals(id).reverse().sortBy('date');

    // Join opponent names
    const oppIds = [...new Set(rawMatches.map((m) => m.opponent_id).filter(Boolean))];
    const opps = oppIds.length ? await db.opponents.bulkGet(oppIds) : [];
    const oppMap = Object.fromEntries(opps.filter(Boolean).map((o) => [o.id, o.name]));

    const matches = rawMatches.map((m) => ({
      ...m,
      opponent_name: m.opponent_name ?? oppMap[m.opponent_id] ?? 'Unknown',
    }));

    const players = await db.players.where('team_id').equals(season.team_id).toArray();
    const playerNames   = Object.fromEntries(players.map((p) => [p.id, p.name]));
    const playerJerseys = Object.fromEntries(players.map((p) => [p.id, p.jersey_number ?? '']));

    return { season, team, matches, playerNames, playerJerseys };
  }, [id]);

  if (!data) return null;
  const { season, team, matches, playerNames, playerJerseys } = data;

  async function handleMaxPreps(e, matchId) {
    e.stopPropagation();
    const stats = await computeMatchStats(matchId);
    exportMaxPrepsCSV(stats.players, playerNames, playerJerseys, stats.setsPlayed, `match-${matchId}-maxpreps.txt`);
  }

  const wins = matches.filter(
    (m) => m.status === MATCH_STATUS.COMPLETE && (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)
  ).length;
  const losses = matches.filter(
    (m) => m.status === MATCH_STATUS.COMPLETE && (m.our_sets_won ?? 0) < (m.opp_sets_won ?? 0)
  ).length;

  return (
    <div>
      <PageHeader title={season.name ?? String(season.year)} backTo="/seasons" />

      <div className="p-4 md:p-6 space-y-4">
        {/* Season info card */}
        <div className="bg-surface rounded-xl px-4 py-3 flex items-center justify-between">
          <div>
            <div className="font-semibold">{team?.name ?? '—'}</div>
            <div className="text-sm text-slate-400">{season.year}</div>
          </div>
          {matches.some((m) => m.status === MATCH_STATUS.COMPLETE) && (
            <div className="text-right">
              <div className="font-mono font-bold text-lg">{wins}–{losses}</div>
              <div className="text-xs text-slate-400">W–L</div>
            </div>
          )}
        </div>

        {/* Matches */}
        <section>
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide">
              Matches ({matches.length})
            </h2>
            <Button size="sm" onClick={() => navigate(`/matches/new?season=${id}`)}>+ Match</Button>
          </div>

          {matches.length === 0 ? (
            <EmptyState
              icon="🏐"
              title="No matches yet"
              description="Record the first match for this season"
              action={<Button onClick={() => navigate(`/matches/new?season=${id}`)}>New Match</Button>}
            />
          ) : (
            <div className="space-y-2">
              {matches.map((match) => (
                <button
                  key={match.id}
                  onClick={() => navigate(
                    match.status === MATCH_STATUS.COMPLETE
                      ? `/matches/${match.id}/summary`
                      : `/matches/${match.id}/live`
                  )}
                  className="w-full bg-surface rounded-xl px-4 py-3 text-left flex items-center justify-between hover:bg-slate-700 transition-colors"
                >
                  <div>
                    <div className="font-semibold">{match.opponent_name}</div>
                    <div className="text-xs text-slate-400">{fmtDate(match.date)}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    {match.status === MATCH_STATUS.COMPLETE && (
                      <button
                        onClick={(e) => handleMaxPreps(e, match.id)}
                        className="text-xs font-bold px-2 py-1 rounded bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                      >
                        MaxPreps
                      </button>
                    )}
                    <div className="text-right flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-1.5">
                        {match.status === MATCH_STATUS.COMPLETE && (() => {
                          const won = (match.our_sets_won ?? 0) > (match.opp_sets_won ?? 0);
                          return (
                            <span className={`text-[10px] font-black px-1.5 py-0.5 rounded ${won ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'}`}>
                              {won ? 'W' : 'L'}
                            </span>
                          );
                        })()}
                        <span className="text-sm font-mono">{match.our_sets_won ?? 0}–{match.opp_sets_won ?? 0}</span>
                      </div>
                      <div className={`text-xs ${match.status === MATCH_STATUS.IN_PROGRESS ? 'text-primary' : 'text-slate-400'}`}>
                        {match.status === MATCH_STATUS.IN_PROGRESS ? 'Live'
                          : match.status === MATCH_STATUS.COMPLETE ? 'Final'
                          : 'Setup'}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
