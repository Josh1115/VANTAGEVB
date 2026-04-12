import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { getIntStorage, setStorageItem, STORAGE_KEYS } from '../utils/storage';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';

const selectClass = 'bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary';

export function OpponentListPage() {
  const navigate = useNavigate();
  const [addOpen, setAddOpen]   = useState(false);
  const [newName, setNewName]   = useState('');
  const [saving,  setSaving]    = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState(() => getIntStorage(STORAGE_KEYS.DEFAULT_TEAM_ID, null));

  const opponents = useLiveQuery(() => db.opponents.toArray(), []);
  const teams     = useLiveQuery(() => db.teams.toArray(), []);

  // Seasons for the selected team — used to constrain match lookup
  const teamSeasons = useLiveQuery(
    () => selectedTeamId ? db.seasons.where('team_id').equals(selectedTeamId).toArray() : Promise.resolve(null),
    [selectedTeamId]
  );
  const teamSeasonIds = useMemo(
    () => teamSeasons ? new Set(teamSeasons.map(s => s.id)) : null,
    [teamSeasons]
  );

  // For each opponent, pull most-recent match date + W/L record
  const matches = useLiveQuery(() => db.matches.toArray(), []);

  function handleTeamChange(e) {
    const id = e.target.value ? Number(e.target.value) : null;
    setSelectedTeamId(id);
    setStorageItem(STORAGE_KEYS.DEFAULT_TEAM_ID, id);
  }

  const oppStats = useMemo(() => {
    if (!opponents || !matches) return {};
    const m = {};
    for (const opp of opponents) {
      // Match by opponent_id (new) OR opponent_name (legacy)
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

  // Sort by most-recently-played first, then alphabetical
  const sorted = [...(opponents ?? [])].sort((a, b) => {
    const la = oppStats[a.id]?.latest ?? '';
    const lb = oppStats[b.id]?.latest ?? '';
    if (lb !== la) return lb.localeCompare(la);
    return (a.name ?? '').localeCompare(b.name ?? '');
  });

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

  return (
    <div>
      <PageHeader
        title="Opponents"
        backTo="/"
        action={<Button size="sm" onClick={() => setAddOpen(v => !v)}>+ Opponent</Button>}
      />

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

      <div className="p-4 space-y-2">
        {sorted.length === 0 ? (
          <EmptyState
            icon="🔭"
            title="No opponents yet"
            description="Opponents are created automatically when you set up a match, or add one manually."
            action={<Button onClick={() => setAddOpen(true)}>+ Opponent</Button>}
          />
        ) : sorted.map(opp => {
          const s = oppStats[opp.id] ?? {};
          const record = s.total > 0 ? `${s.wins}–${s.losses}` : null;
          const lastDate = s.latest
            ? new Date(s.latest).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
            : null;
          return (
            <button
              key={opp.id}
              onClick={() => navigate(`/opponents/${opp.id}`)}
              className="w-full bg-surface rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-700 active:scale-[0.98] transition-[transform,background-color] duration-75"
            >
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-white truncate">{opp.name}</div>
                {lastDate && (
                  <div className="text-xs text-slate-400 mt-0.5">Last played {lastDate}</div>
                )}
              </div>
              {record && (
                <span className="text-sm font-semibold text-slate-300 shrink-0">{record}</span>
              )}
              <span className="text-slate-600 text-lg">›</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
