import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { MATCH_STATUS, JERSEY_COLORS } from '../constants';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { EmptyState } from '../components/ui/EmptyState';
import { useUiStore, selectShowToast } from '../store/uiStore';

const JERSEY_HEX = Object.fromEntries(JERSEY_COLORS.map(c => [c.id, c.bg]));
const DEFAULT_ACCENT = '#f97316'; // app orange

const GENDER_ORDER  = ['F', 'M'];
const GENDER_LABELS = { F: 'Girls', M: 'Boys' };
const LEVEL_ORDER   = ['varsity', 'jv', 'frosh', 'freshman', 'other'];
const LEVEL_LABELS  = { varsity: 'Varsity', jv: 'JV', frosh: 'Freshman', freshman: 'Freshman' };
const levelLabel = (l) => LEVEL_LABELS[l?.toLowerCase()] ?? (l ? l.charAt(0).toUpperCase() + l.slice(1) : 'Other');
const levelRank  = (l) => { const i = LEVEL_ORDER.indexOf(l?.toLowerCase()); return i === -1 ? 99 : i; };

function getAccent(team) {
  const color = Array.isArray(team?.team_jersey_color)
    ? team.team_jersey_color[0]
    : team?.team_jersey_color;
  return JERSEY_HEX[color] ?? DEFAULT_ACCENT;
}

function NewSeasonModal({ onClose }) {
  const navigate = useNavigate();
  const showToast = useUiStore(selectShowToast);
  const [gender, setGender] = useState('');
  const [teamId, setTeamId] = useState('');
  const [name, setName] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  const teams = useLiveQuery(() => db.teams.orderBy('name').toArray(), []);

  const filteredTeams = gender
    ? (teams ?? []).filter(t => t.gender === gender)
    : (teams ?? []);

  function handleGenderChange(e) {
    setGender(e.target.value);
    setTeamId('');
  }

  const sel = 'w-full bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white';

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
          <label className="block text-sm text-slate-400 mb-1">Gender</label>
          <select className={sel} value={gender} onChange={handleGenderChange} autoFocus>
            <option value="">— All —</option>
            <option value="F">Girls</option>
            <option value="M">Boys</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Team</label>
          <select className={sel} value={teamId} onChange={(e) => setTeamId(e.target.value)}>
            <option value="">— Select team —</option>
            {filteredTeams.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Season Name</label>
          <input
            className={sel}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Fall 2025"
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Year</label>
          <input
            type="number"
            className={sel}
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
      const isActive = s.status !== 'ended';
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
        ) : (() => {
          const all = seasons ?? [];

          // Group by gender → level
          const byGender = {};
          for (const s of all) {
            const g = GENDER_ORDER.includes(s.team?.gender) ? s.team.gender : 'other';
            const l = s.team?.level?.toLowerCase() ?? 'other';
            (byGender[g] ??= {})[l] ??= [];
            byGender[g][l].push(s);
          }

          const genders = [...GENDER_ORDER.filter(g => byGender[g]), ...(byGender['other'] ? ['other'] : [])];

          const SeasonCard = (season) => {
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
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold truncate">{season.name ?? String(season.year)}</span>
                      <span className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded ${season.isActive ? 'bg-green-500/20 text-green-400' : 'bg-slate-600/60 text-slate-400'}`}>
                        {season.isActive ? 'ACTIVE' : 'DONE'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {season.played > 0 && (
                        <span className="font-mono font-bold text-sm tabular-nums">{season.wins}–{season.losses}</span>
                      )}
                      <span className="text-slate-500 text-lg">›</span>
                    </div>
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {season.team?.name ?? '—'} · {season.year}
                    {season.total > 0 && <> · {season.played}/{season.total} matches</>}
                  </div>
                  {season.total > 0 && (
                    <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: accent }} />
                    </div>
                  )}
                </div>
              </button>
            );
          };

          return (
            <div className="space-y-6">
              {genders.map(g => {
                const levelMap = byGender[g];
                const levels = Object.keys(levelMap).sort((a, b) => levelRank(a) - levelRank(b));
                return (
                  <div key={g}>
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 mb-3">
                      {GENDER_LABELS[g] ?? 'Other'}
                    </p>
                    <div className="space-y-4">
                      {levels.map(l => (
                        <div key={l}>
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-600 mb-2 pl-1">
                            {levelLabel(l)}
                          </p>
                          <div className="space-y-2">
                            {levelMap[l].map(SeasonCard)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>

      {showModal && <NewSeasonModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
