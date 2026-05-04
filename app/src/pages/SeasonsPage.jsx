import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { MATCH_STATUS } from '../constants';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useUiStore, selectShowToast } from '../store/uiStore';

const JERSEY_HEX = {
  black:  '#111827',
  white:  '#f8fafc',
  gray:   '#94a3b8',
  red:    '#dc2626',
  orange: '#ea580c',
  yellow: '#ca8a04',
  green:  '#16a34a',
  blue:   '#1d4ed8',
  purple: '#7c3aed',
  pink:   '#db2777',
};
const DEFAULT_ACCENT = '#f97316'; // app orange

function getAccent(team) {
  const color = Array.isArray(team?.team_jersey_color)
    ? team.team_jersey_color[0]
    : team?.team_jersey_color;
  return JERSEY_HEX[color] ?? DEFAULT_ACCENT;
}

function NewSeasonModal({ onClose }) {
  const navigate = useNavigate();
  const showToast = useUiStore(selectShowToast);
  const [teamId, setTeamId] = useState('');
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  const teams = useLiveQuery(() => db.teams.orderBy('name').toArray(), []);

  const save = async () => {
    if (!teamId) { showToast('Select a team', 'error'); return; }
    if (!name.trim()) { showToast('Enter a season name', 'error'); return; }
    try {
      const id = await db.seasons.add({ team_id: Number(teamId), name: name.trim(), year: Number(year) });
      onClose();
      navigate(`/seasons/${id}`);
    } catch (err) {
      showToast(`Save failed: ${err.message}`, 'error');
    }
  };

  return (
    <Modal
      title="New Season"
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Create</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Team</label>
          <select
            className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            autoFocus
          >
            <option value="">— Select team —</option>
            {(teams ?? []).map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Season Name</label>
          <input
            className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fall 2025"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Year</label>
          <input
            type="number"
            className="w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white"
            value={year}
            onChange={(e) => setYear(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  );
}

export function SeasonsPage() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  const seasons = useLiveQuery(async () => {
    const allSeasons = await db.seasons.orderBy('year').reverse().toArray();
    const teamIds = [...new Set(allSeasons.map((s) => s.team_id))];
    const teams = await db.teams.bulkGet(teamIds);
    const teamMap = Object.fromEntries(teams.filter(Boolean).map((t) => [t.id, t]));

    // Fetch all matches across all seasons in one query
    const seasonIds = allSeasons.map((s) => s.id);
    const allMatches = seasonIds.length
      ? await db.matches.where('season_id').anyOf(seasonIds).toArray()
      : [];

    const matchesBySeason = {};
    for (const m of allMatches) {
      (matchesBySeason[m.season_id] ??= []).push(m);
    }

    return allSeasons.map((s) => {
      const team = teamMap[s.team_id];
      const matches = matchesBySeason[s.id] ?? [];
      const completed = matches.filter((m) => m.status === MATCH_STATUS.COMPLETE && m.match_type !== 'exhibition');
      const wins   = completed.filter((m) => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
      const losses = completed.length - wins;
      const isActive = matches.some(
        (m) => m.status === MATCH_STATUS.SCHEDULED || m.status === MATCH_STATUS.IN_PROGRESS || m.status === MATCH_STATUS.SETUP
      );
      return {
        ...s,
        team,
        wins,
        losses,
        played: completed.length,
        total:  matches.length,
        isActive,
      };
    });
  }, []);

  return (
    <div>
      <PageHeader title="Seasons" backTo="/" />

      <div className="p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <span className="text-sm text-slate-400">{(seasons ?? []).length} seasons</span>
          <Button size="sm" onClick={() => setShowModal(true)}>+ Season</Button>
        </div>

        {(seasons ?? []).length === 0 ? (
          <EmptyState
            icon="📅"
            title="No seasons yet"
            description="Create a season to organize your matches by team and year"
            action={<Button onClick={() => setShowModal(true)}>New Season</Button>}
          />
        ) : (
          <div className="space-y-2">
            {(seasons ?? []).map((season) => {
              const accent = getAccent(season.team);
              const pct = season.total > 0 ? (season.played / season.total) * 100 : 0;
              return (
                <button
                  key={season.id}
                  onClick={() => navigate(`/seasons/${season.id}`)}
                  className="w-full bg-surface rounded-xl overflow-hidden text-left hover:bg-slate-700 transition-colors"
                  style={{ borderLeft: `4px solid ${accent}` }}
                >
                  <div className="px-4 py-3">
                    {/* Top row: name + badge + W/L + chevron */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-semibold truncate">{season.name ?? String(season.year)}</span>
                        <span
                          className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            season.isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-slate-600/60 text-slate-400'
                          }`}
                        >
                          {season.isActive ? 'ACTIVE' : 'DONE'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {season.played > 0 && (
                          <span className="font-mono font-bold text-sm tabular-nums">
                            {season.wins}–{season.losses}
                          </span>
                        )}
                        <span className="text-slate-500 text-lg">›</span>
                      </div>
                    </div>

                    {/* Sub-label: team · year · match count */}
                    <div className="text-xs text-slate-400 mt-0.5">
                      {season.team?.name ?? '—'} · {season.year}
                      {season.total > 0 && (
                        <> · {season.played}/{season.total} matches</>
                      )}
                    </div>

                    {/* Progress bar */}
                    {season.total > 0 && (
                      <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: accent }}
                        />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showModal && <NewSeasonModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
