import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useUiStore, selectShowToast } from '../store/uiStore';

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
    return allSeasons.map((s) => ({ ...s, team: teamMap[s.team_id] }));
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
            {(seasons ?? []).map((season) => (
              <button
                key={season.id}
                onClick={() => navigate(`/seasons/${season.id}`)}
                className="w-full bg-surface rounded-xl px-4 py-3 text-left flex items-center justify-between hover:bg-slate-700 transition-colors"
              >
                <div>
                  <div className="font-semibold">{season.name ?? String(season.year)}</div>
                  <div className="text-xs text-slate-400">{season.team?.name ?? '—'} · {season.year}</div>
                </div>
                <span className="text-slate-500 text-lg">›</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {showModal && <NewSeasonModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
