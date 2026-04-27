import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { getIntStorage, setStorageItem, STORAGE_KEYS } from '../utils/storage';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

const selectClass = 'bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary';

const TENDENCY_TYPES = [
  { type: 'serve_target',       label: 'Serve Target',    icon: '🎯' },
  { type: 'attack_pattern',     label: 'Attack Pattern',  icon: '⚡' },
  { type: 'defense_style',      label: 'Defense Style',   icon: '🛡️' },
  { type: 'rotation_strength',  label: 'Strong Rotation', icon: '💪' },
  { type: 'rotation_weakness',  label: 'Weak Rotation',   icon: '⚠️' },
  { type: 'key_player',         label: 'Key Player',      icon: '⭐' },
  { type: 'note',               label: 'Note',            icon: '📝' },
];
const TYPE_ICON = Object.fromEntries(TENDENCY_TYPES.map(t => [t.type, t.icon]));

// ── Scouting report card ──────────────────────────────────────────────────────

function ScoutingCard({ opp, tendencies, navigate }) {
  const count = tendencies?.length ?? 0;
  const preview = (tendencies ?? []).slice(0, 4);

  return (
    <button
      onClick={() => navigate(`/opponents/${opp.id}`)}
      className="w-full bg-surface rounded-xl px-4 py-3 text-left hover:bg-slate-700 active:scale-[0.98] transition-[transform,background-color] duration-75"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-white">{opp.name}</span>
        <div className="flex items-center gap-2">
          {count > 0 && (
            <span className="text-xs text-slate-500">{count} {count === 1 ? 'note' : 'notes'}</span>
          )}
          <span className="text-slate-600 text-lg">›</span>
        </div>
      </div>

      {preview.map(t => (
        <div key={t.id} className="flex items-start gap-1.5 mt-1">
          <span className="text-sm shrink-0 mt-0.5">{TYPE_ICON[t.type] ?? '📝'}</span>
          <p className="text-xs text-slate-300 line-clamp-1">{t.value}</p>
        </div>
      ))}
      {count > 4 && (
        <p className="text-xs text-slate-500 mt-1.5 ml-5">+{count - 4} more…</p>
      )}

      {opp.notes && !count && (
        <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">📝 {opp.notes}</p>
      )}
      {opp.notes && count > 0 && (
        <p className="text-xs text-slate-500 mt-1.5 ml-5 italic">+ notes</p>
      )}
    </button>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export function OpponentListPage() {
  const navigate = useNavigate();
  const [view,    setView]    = useState('scouting');
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving,  setSaving]  = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(() => getIntStorage(STORAGE_KEYS.DEFAULT_TEAM_ID, null));

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

  // Sort opponents by most-recently-played first, then alphabetical
  const sortedOpponents = useMemo(() => [...(opponents ?? [])].sort((a, b) => {
    const la = oppStats[a.id]?.latest ?? '';
    const lb = oppStats[b.id]?.latest ?? '';
    if (lb !== la) return lb.localeCompare(la);
    return (a.name ?? '').localeCompare(b.name ?? '');
  }), [opponents, oppStats]);

  // Tendencies grouped by opp_id, filtered by selected team
  const tendenciesByOpp = useMemo(() => {
    const g = {};
    for (const t of allTendencies ?? []) {
      if (selectedTeamId && t.team_id && t.team_id !== selectedTeamId) continue;
      (g[t.opp_id] ??= []).push(t);
    }
    return g;
  }, [allTendencies, selectedTeamId]);

  // Opponents with any scouting data, sorted alphabetically
  const scoutedOpps = useMemo(() =>
    (opponents ?? [])
      .filter(opp => (tendenciesByOpp[opp.id]?.length > 0) || opp.notes)
      .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? '')),
    [opponents, tendenciesByOpp]
  );

  async function handleAdd() {
    const name = newName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const id = await db.opponents.add({ name });
      setNewName('');
      setAddOpen(false);
      navigate(`/opponents/${id}`);
    } finally {
      setSaving(false);
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

  return (
    <div className="pb-24">
      <PageHeader
        title="Opponents"
        backTo="/"
        action={<Button size="sm" onClick={() => setAddOpen(v => !v)}>+ Opponent</Button>}
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

      {/* Add opponent inline form */}
      {addOpen && (
        <div className="mx-4 mt-2 flex gap-2">
          <input
            autoFocus
            className="flex-1 px-3 py-2 rounded-lg bg-surface border border-slate-600 text-white text-sm placeholder:text-slate-500"
            placeholder="Opponent name…"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
          />
          <Button onClick={handleAdd} disabled={saving || !newName.trim()}>Add</Button>
        </div>
      )}

      {/* ── Scouting Reports view ── */}
      {view === 'scouting' && (
        <div className="p-4 space-y-3">
          {scoutedOpps.length === 0 ? (
            <EmptyState
              icon="🔭"
              title="No scouting reports yet"
              description="Add tendencies or notes from an opponent's profile to build your scouting library."
              action={<Button onClick={() => setView('opponents')}>View Opponents</Button>}
            />
          ) : scoutedOpps.map(opp => (
            <ScoutingCard
              key={opp.id}
              opp={opp}
              tendencies={tendenciesByOpp[opp.id]}
              navigate={navigate}
            />
          ))}
        </div>
      )}

      {/* ── Opponent View ── */}
      {view === 'opponents' && (
        <div className="p-4 space-y-2">
          {sortedOpponents.length === 0 ? (
            <EmptyState
              icon="🔭"
              title="No opponents yet"
              description="Opponents are created automatically when you set up a match, or add one manually."
              action={<Button onClick={() => setAddOpen(true)}>+ Opponent</Button>}
            />
          ) : sortedOpponents.map(opp => {
            const s = oppStats[opp.id] ?? {};
            const record   = s.total > 0 ? `${s.wins}–${s.losses}` : null;
            const lastDate = s.latest
              ? new Date(s.latest).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : null;
            const scoutCount = tendenciesByOpp[opp.id]?.length ?? 0;
            return (
              <button
                key={opp.id}
                onClick={() => navigate(`/opponents/${opp.id}`)}
                className="w-full bg-surface rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-700 active:scale-[0.98] transition-[transform,background-color] duration-75"
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white truncate">{opp.name}</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    {lastDate && <span className="text-xs text-slate-400">Last played {lastDate}</span>}
                    {scoutCount > 0 && (
                      <span className="text-xs text-primary/80">🔭 {scoutCount}</span>
                    )}
                  </div>
                </div>
                {record && (
                  <span className="text-sm font-semibold text-slate-300 shrink-0">{record}</span>
                )}
                <span className="text-slate-600 text-lg">›</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
