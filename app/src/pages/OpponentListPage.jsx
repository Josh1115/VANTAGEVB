import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { getIntStorage, getStorageItem, setStorageItem, STORAGE_KEYS } from '../utils/storage';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { SwipeableMatchCard } from '../components/ui/SwipeableMatchCard';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';

function loadArchivedIds() {
  try { return new Set(JSON.parse(getStorageItem(STORAGE_KEYS.ARCHIVED_OPPONENTS, '[]'))); }
  catch { return new Set(); }
}
function saveArchivedIds(set) {
  setStorageItem(STORAGE_KEYS.ARCHIVED_OPPONENTS, JSON.stringify([...set]));
}

const selectClass = 'bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary';

const TENDENCY_TYPES = [
  { type: 'serve_target',       label: 'Serve Target',    icon: '🎯' },
  { type: 'attack_pattern',     label: 'Attack Pattern',  icon: '📐' },
  { type: 'defense_style',      label: 'Defense Style',   icon: '🛡️' },
  { type: 'rotation_strength',  label: 'Strong Rotation', icon: '💪' },
  { type: 'rotation_weakness',  label: 'Weak Rotation',   icon: '⚠️' },
  { type: 'key_player',         label: 'Key Player',      icon: '⭐' },
  { type: 'note',               label: 'Note',            icon: '📝' },
];

// ── Combined season scouting report ──────────────────────────────────────────

function OppReportSection({ opp, tendencies, navigate }) {
  const grouped = useMemo(() => {
    const g = {};
    for (const t of tendencies ?? []) {
      (g[t.type] ??= []).push(t);
    }
    return g;
  }, [tendencies]);

  const hasContent = (tendencies?.length ?? 0) > 0 || opp.notes;
  if (!hasContent) return null;

  return (
    <div className="bg-surface rounded-xl overflow-hidden border border-slate-700/50">
      {/* Opponent header */}
      <button
        onClick={() => navigate(`/opponents/${opp.id}`)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-700/40 hover:bg-slate-700/70 transition-colors"
      >
        <span className="font-bold text-white">{opp.name}</span>
        <span className="text-slate-500 text-lg">›</span>
      </button>

      <div className="px-4 py-3 space-y-3">
        {/* Tendencies grouped by type */}
        {TENDENCY_TYPES.filter(t => grouped[t.type]?.length).map(({ type, label, icon }) => (
          <div key={type}>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1">
              <span>{icon}</span> {label}
            </p>
            <div className="space-y-1">
              {grouped[type].map(item => (
                <p key={item.id} className="text-sm text-slate-200 leading-snug pl-4 border-l border-slate-700">
                  {item.value}
                </p>
              ))}
            </div>
          </div>
        ))}

        {/* Free-text notes */}
        {opp.notes && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1.5 flex items-center gap-1">
              <span>📝</span> Notes
            </p>
            <p className="text-sm text-slate-300 whitespace-pre-wrap pl-4 border-l border-slate-700">{opp.notes}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function OpponentListPage() {
  const navigate = useNavigate();
  const [view,          setView]          = useState('scouting');
  const [deleteTarget,  setDeleteTarget]  = useState(null); // { id, name }
  const [deleting,      setDeleting]      = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(() => getIntStorage(STORAGE_KEYS.DEFAULT_TEAM_ID, null));
  const [archivedIds,   setArchivedIds]   = useState(loadArchivedIds);
  const [showArchived,  setShowArchived]  = useState(false);

  const toggleArchive = useCallback((id) => {
    setArchivedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveArchivedIds(next);
      return next;
    });
  }, []);

  const opponents     = useLiveQuery(() => db.opponents.toArray(), []);
  const teams         = useLiveQuery(() => db.teams.toArray(), []);
  const matches       = useLiveQuery(() => db.matches.toArray(), []);
  const allTendencies = useLiveQuery(() => db.opp_tendencies.toArray(), []);

  const teamSeasons = useLiveQuery(
    () => selectedTeamId ? db.seasons.where('team_id').equals(selectedTeamId).toArray() : Promise.resolve(null),
    [selectedTeamId]
  );
  const teamSeasonIds = useMemo(
    () => teamSeasons ? new Set(teamSeasons.map(s => s.id)) : null,
    [teamSeasons]
  );

  // Most recent season for the selected team
  const currentSeason = useMemo(() => {
    if (!teamSeasons?.length) return null;
    return [...teamSeasons].sort((a, b) => String(b.year).localeCompare(String(a.year)))[0];
  }, [teamSeasons]);

  // Match IDs in the current season
  const currentSeasonMatchIds = useMemo(() => {
    if (!currentSeason || !matches) return null;
    return new Set(matches.filter(m => m.season_id === currentSeason.id).map(m => m.id));
  }, [currentSeason, matches]);

  function handleTeamChange(e) {
    const id = e.target.value ? Number(e.target.value) : null;
    setSelectedTeamId(id);
    setStorageItem(STORAGE_KEYS.DEFAULT_TEAM_ID, id);
  }

  // W/L records per opponent (opponent view)
  const oppStats = useMemo(() => {
    if (!opponents || !matches) return {};
    const m = {};
    for (const opp of opponents) {
      const nameLower = (opp.name ?? '').toLowerCase();
      const played = matches.filter(match => {
        const matchesOpp = match.opponent_id === opp.id ||
          (!match.opponent_id && (match.opponent_name ?? '').toLowerCase() === nameLower);
        if (!matchesOpp) return false;
        if (teamSeasonIds && !teamSeasonIds.has(match.season_id)) return false;
        return true;
      });
      const complete = played.filter(match => match.status === 'complete');
      const wins   = complete.filter(match => (match.our_sets_won ?? 0) > (match.opp_sets_won ?? 0)).length;
      const losses = complete.filter(match => (match.opp_sets_won ?? 0) > (match.our_sets_won ?? 0)).length;
      const latest = played.reduce((best, match) => {
        if (!match.date) return best;
        return !best || match.date > best ? match.date : best;
      }, null);
      m[opp.id] = { wins, losses, total: played.length, latest };
    }
    return m;
  }, [opponents, matches, teamSeasonIds]);

  const sortedOpponents = useMemo(() => [...(opponents ?? [])].sort((a, b) => {
    const la = oppStats[a.id]?.latest ?? '';
    const lb = oppStats[b.id]?.latest ?? '';
    if (lb !== la) return lb.localeCompare(la);
    return (a.name ?? '').localeCompare(b.name ?? '');
  }), [opponents, oppStats]);

  const archivedCount    = useMemo(() => sortedOpponents.filter(o => archivedIds.has(o.id)).length, [sortedOpponents, archivedIds]);
  const visibleOpponents = useMemo(
    () => showArchived ? sortedOpponents : sortedOpponents.filter(o => !archivedIds.has(o.id)),
    [sortedOpponents, archivedIds, showArchived]
  );

  // Tendencies for the scouting report:
  // - match-linked tendencies from the current season's matches
  // - general tendencies saved for the selected team (no match_id)
  // - if no team selected: all tendencies
  const reportTendenciesByOpp = useMemo(() => {
    const g = {};
    for (const t of allTendencies ?? []) {
      let include = false;
      if (!selectedTeamId) {
        include = true;
      } else if (t.match_id) {
        include = currentSeasonMatchIds?.has(t.match_id) ?? false;
      } else {
        include = !t.team_id || t.team_id === selectedTeamId;
      }
      if (include) (g[t.opp_id] ??= []).push(t);
    }
    return g;
  }, [allTendencies, selectedTeamId, currentSeasonMatchIds]);

  // Opponents with scouting data this season, sorted alphabetically
  const reportOpps = useMemo(() =>
    (opponents ?? [])
      .filter(opp => (reportTendenciesByOpp[opp.id]?.length > 0) || opp.notes)
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [opponents, reportTendenciesByOpp]
  );

  // Scouting count per opp (for opponent view badge)
  const scoutCountByOpp = useMemo(() => {
    const c = {};
    for (const t of allTendencies ?? []) {
      if (selectedTeamId && t.team_id && t.team_id !== selectedTeamId) continue;
      c[t.opp_id] = (c[t.opp_id] ?? 0) + 1;
    }
    return c;
  }, [allTendencies, selectedTeamId]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await db.opp_tendencies.where('opp_id').equals(deleteTarget.id).delete();
      await db.matches.where('opponent_id').equals(deleteTarget.id).modify({ opponent_id: null });
      await db.opponents.delete(deleteTarget.id);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  const ViewPill = ({ value, label }) => (
    <button
      onClick={() => setView(value)}
      className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
        view === value ? 'bg-primary text-white' : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      {label}
    </button>
  );

  const seasonLabel = currentSeason?.year ?? null;

  return (
    <div className="pb-24">
      <PageHeader
        title="Opponents"
        backTo="/"
      />

      {/* View toggle */}
      <div className="flex bg-slate-800 rounded-xl p-1 gap-1 mx-4 mt-3">
        <ViewPill value="scouting"  label="Scouting Reports" />
        <ViewPill value="opponents" label="Opponent View"    />
      </div>

      {/* Team filter */}
      {(teams ?? []).length > 0 && (
        <div className="px-4 pt-3 pb-1">
          <select className={selectClass} value={selectedTeamId ?? ''} onChange={handleTeamChange}>
            <option value="">All Teams</option>
            {(teams ?? []).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Scouting Reports view ── */}
      {view === 'scouting' && (
        <div className="p-4 space-y-4">
          {/* Season label */}
          {seasonLabel && (
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {seasonLabel} Season · Combined Report
            </p>
          )}

          {reportOpps.length === 0 ? (
            <EmptyState
              icon="🔭"
              title="No scouting reports yet"
              description="Add tendencies or notes from an opponent's profile to build your scouting library."
              action={<Button onClick={() => setView('opponents')}>View Opponents</Button>}
            />
          ) : reportOpps.map(opp => (
            <OppReportSection
              key={opp.id}
              opp={opp}
              tendencies={reportTendenciesByOpp[opp.id]}
              navigate={navigate}
            />
          ))}
        </div>
      )}

      {/* ── Opponent View ── */}
      {view === 'opponents' && (
        <div className="p-4">
          {sortedOpponents.length === 0 ? (
            <EmptyState
              icon="🔭"
              title="No opponents yet"
              description="Opponents are created automatically when you set up a match."
            />
          ) : (
            <>
              {archivedCount > 0 && (
                <button
                  onClick={() => setShowArchived(v => !v)}
                  className="w-full text-xs text-slate-500 hover:text-slate-300 text-center py-2 mb-2 transition-colors"
                >
                  {showArchived ? `Hide ${archivedCount} archived opponent${archivedCount !== 1 ? 's' : ''}` : `Show ${archivedCount} archived opponent${archivedCount !== 1 ? 's' : ''}`}
                </button>
              )}
              {visibleOpponents.map((opp, i) => {
                const s = oppStats[opp.id] ?? {};
                const isArchived = archivedIds.has(opp.id);
                const record   = s.total > 0 ? `${s.wins}–${s.losses}` : null;
                const lastDate = s.latest
                  ? new Date(s.latest).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                  : null;
                const scoutCount = scoutCountByOpp[opp.id] ?? 0;
                return (
                  <SwipeableMatchCard
                    key={opp.id}
                    animDelay={`${i * 30}ms`}
                    onDeleteConfirm={() => setDeleteTarget({ id: opp.id, name: opp.name })}
                  >
                    <div className={`w-full bg-surface rounded-xl px-4 py-3 flex items-center gap-3 ${isArchived ? 'opacity-50' : ''}`}>
                      <button
                        onClick={() => navigate(`/opponents/${opp.id}`)}
                        className="flex-1 min-w-0 text-left"
                      >
                        <div className="font-semibold text-white truncate">{opp.name}</div>
                        <div className="flex items-center gap-3 mt-0.5">
                          {lastDate && <span className="text-xs text-slate-400">Last played {lastDate}</span>}
                          {scoutCount > 0 && (
                            <span className="text-xs text-primary/80">🔭 {scoutCount}</span>
                          )}
                        </div>
                      </button>
                      {record && (
                        <span className="text-sm font-semibold text-slate-300 shrink-0">{record}</span>
                      )}
                      <button
                        onClick={() => toggleArchive(opp.id)}
                        title={isArchived ? 'Unarchive' : 'Archive (hide from list)'}
                        className="text-slate-600 hover:text-slate-400 transition-colors shrink-0 px-1"
                      >
                        {isArchived ? '↩' : '⊘'}
                      </button>
                      <button
                        onClick={() => navigate(`/opponents/${opp.id}`)}
                        className="text-slate-600 text-lg shrink-0"
                      >›</button>
                    </div>
                  </SwipeableMatchCard>
                );
              })}
            </>
          )}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title={`Delete ${deleteTarget.name}?`}
          message="This removes their profile and all scouting notes. Matches played against them are kept."
          confirmLabel={deleting ? 'Deleting…' : 'Delete'}
          danger
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
