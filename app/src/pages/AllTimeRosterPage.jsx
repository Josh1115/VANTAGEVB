import { useMemo, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { PageHeader } from '../components/layout/PageHeader';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';

const POS_COLOR = { S: 'blue', OH: 'orange', OPP: 'orange', MB: 'green', L: 'gray', DS: 'gray', RS: 'orange' };
const GENDER_LABELS = { F: 'Girls', M: 'Boys', Mixed: 'Mixed' };

export function AllTimeRosterPage() {
  const { orgId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const gender = searchParams.get('gender') ?? null;
  const oid = Number(orgId);

  const [expandedKey, setExpandedKey] = useState(null);

  const data = useLiveQuery(async () => {
    const [org, allTeams] = await Promise.all([
      db.organizations.get(oid),
      db.teams.where('org_id').equals(oid).toArray(),
    ]);
    const teams = gender ? allTeams.filter(t => t.gender === gender) : allTeams;
    const teamIds = teams.map(t => t.id);
    if (!teamIds.length) return { org, players: [], playerYears: {}, teamMap: {} };

    const playerArrays = await Promise.all(teamIds.map(tid => db.players.where('team_id').equals(tid).toArray()));
    const allPlayers = playerArrays.flat();

    const seasons = await db.seasons.where('team_id').anyOf(teamIds).toArray();
    const seasonYearMap = Object.fromEntries(seasons.map(s => [s.id, String(s.year)]));
    const seasonIds = seasons.map(s => s.id);
    const matches = seasonIds.length
      ? await db.matches.where('season_id').anyOf(seasonIds).toArray()
      : [];
    const matchSeasonMap = Object.fromEntries(matches.map(m => [m.id, m.season_id]));

    const playerIds = allPlayers.map(p => p.id);
    const contacts = playerIds.length
      ? await db.contacts.where('player_id').anyOf(playerIds).toArray()
      : [];

    // per-player-record years
    const playerYears = {};
    for (const c of contacts) {
      const seasonId = matchSeasonMap[c.match_id];
      if (!seasonId) continue;
      const year = seasonYearMap[seasonId];
      if (!year) continue;
      if (!playerYears[c.player_id]) playerYears[c.player_id] = new Set();
      playerYears[c.player_id].add(year);
    }

    const teamMap = Object.fromEntries(teams.map(t => [t.id, t]));
    return { org, players: allPlayers, playerYears, teamMap };
  }, [oid, gender]);

  // Group by normalized name → one entry per unique person
  const playerGroups = useMemo(() => {
    if (!data?.players) return [];
    const { players, playerYears, teamMap } = data;

    const groups = {};
    for (const p of players) {
      const key = (p.name ?? '').trim().toLowerCase();
      if (!groups[key]) {
        groups[key] = { key, displayName: p.name, records: [], allYears: new Set(), positions: new Set() };
      }
      groups[key].records.push(p);
      if (p.position) groups[key].positions.add(p.position);
      const years = playerYears[p.id];
      if (years) for (const y of years) groups[key].allYears.add(y);
    }

    return Object.values(groups)
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map(g => ({
        ...g,
        allYears: [...g.allYears].sort(),
        positions: [...g.positions],
        // sort records: most recent years first, then by team name
        records: [...g.records].sort((a, b) => {
          const aMax = playerYears[a.id] ? Math.max(...[...playerYears[a.id]].map(Number)) : 0;
          const bMax = playerYears[b.id] ? Math.max(...[...playerYears[b.id]].map(Number)) : 0;
          if (bMax !== aMax) return bMax - aMax;
          return (teamMap[a.team_id]?.name ?? '').localeCompare(teamMap[b.team_id]?.name ?? '');
        }),
      }));
  }, [data]);

  if (!data) {
    return <div className="flex items-center justify-center h-48"><Spinner /></div>;
  }

  const { org, playerYears, teamMap } = data;
  const genderLabel = gender ? (GENDER_LABELS[gender] ?? gender) : null;
  const title = genderLabel ? `${genderLabel} All Time Roster` : 'All Time Roster';

  return (
    <div>
      <PageHeader title={title} subtitle={org?.name} backTo="/teams" />

      {playerGroups.length === 0 ? (
        <EmptyState icon="🏐" title="No players found" description="Add players to teams in this organization to see them here." />
      ) : (
        <div className="px-4 py-3 space-y-1">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 pb-2">
            {playerGroups.length} player{playerGroups.length !== 1 ? 's' : ''}
          </p>

          {playerGroups.map((group) => {
            const isMultiTeam = group.records.length > 1;
            const isExpanded = expandedKey === group.key;

            return (
              <div key={group.key} className="bg-surface rounded-xl overflow-hidden">
                {/* Main row */}
                <button
                  onClick={() => {
                    if (isMultiTeam) {
                      setExpandedKey(isExpanded ? null : group.key);
                    } else {
                      const r = group.records[0];
                      navigate(`/teams/${r.team_id}/players/${r.id}`);
                    }
                  }}
                  className="w-full px-4 py-3 flex items-center gap-3 text-left active:brightness-110 transition-all"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-white truncate">{group.displayName}</div>
                    <div className="flex gap-1.5 flex-wrap items-center mt-0.5">
                      {group.positions.map(pos => (
                        <Badge key={pos} color={POS_COLOR[pos] ?? 'gray'}>{pos}</Badge>
                      ))}
                      {isMultiTeam && (
                        <span className="text-[10px] font-bold text-primary uppercase tracking-wide">
                          {group.records.length} teams
                        </span>
                      )}
                      {!isMultiTeam && teamMap[group.records[0]?.team_id] && (
                        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                          {teamMap[group.records[0].team_id].name}
                        </span>
                      )}
                      {group.allYears.length > 0 && (
                        <span className="text-[10px] text-slate-500">{group.allYears.join(', ')}</span>
                      )}
                    </div>
                  </div>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                    className={`text-slate-600 shrink-0 transition-transform duration-200 ${isMultiTeam && isExpanded ? 'rotate-90' : ''}`}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>

                {/* Per-team breakdown — shown when expanded */}
                {isMultiTeam && isExpanded && (
                  <div className="border-t border-slate-700/60 divide-y divide-slate-700/40">
                    {group.records.map((r) => {
                      const team = teamMap[r.team_id];
                      const years = playerYears[r.id]
                        ? [...playerYears[r.id]].sort().join(', ')
                        : null;
                      return (
                        <button
                          key={r.id}
                          onClick={() => navigate(`/teams/${r.team_id}/players/${r.id}`)}
                          className="w-full px-5 py-2.5 flex items-center gap-3 text-left hover:bg-slate-700/30 transition-colors"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-slate-200 truncate">
                              {team?.name ?? 'Unknown Team'}
                            </div>
                            {years && (
                              <div className="text-[10px] text-slate-500">{years}</div>
                            )}
                          </div>
                          <span className="text-xs text-primary font-semibold shrink-0">View Stats →</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
