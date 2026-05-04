import { useState, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { COLLEGE_DIVISIONS, MATCH_STATUS } from '../constants';
import { STORAGE_KEYS, getIntStorage } from '../utils/storage';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtWinPct(wins, games) {
  if (wins == null || !games) return null;
  return (wins / games * 100).toFixed(1) + '%';
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────

const EMPTY_FORM = {
  year: '', title: '', head_coach: '', tenure_year: '', asst_coach: '',
  games: '', wins: '', losses: '',
  state_rank: '', national_rank: '',
  playoff_seed: '', regional: '', sectional: '', state_finish: '', playoff_result: '',
};

function HistoryModal({ teamId, onClose, editId, initialData }) {
  const [form, setForm] = useState(initialData ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); setError(''); }

  async function handleSave() {
    if (!form.year.trim()) { setError('Season year is required.'); return; }
    setSaving(true);
    const fields = {
      team_id:        teamId,
      year:           form.year.trim(),
      title:          form.title.trim()          || null,
      head_coach:     form.head_coach.trim()     || null,
      asst_coach:     form.asst_coach.trim()     || null,
      tenure_year:    form.tenure_year  ? Number(form.tenure_year)  : null,
      games:          form.games        ? Number(form.games)        : null,
      wins:           form.wins         ? Number(form.wins)         : null,
      losses:         form.losses       ? Number(form.losses)       : null,
      state_rank:     form.state_rank    ? Number(form.state_rank)    : null,
      national_rank:  form.national_rank ? Number(form.national_rank) : null,
      playoff_seed:   form.playoff_seed.trim()   || null,
      regional:       form.regional.trim()       || null,
      sectional:      form.sectional.trim()      || null,
      state_finish:   form.state_finish.trim()   || null,
      playoff_result: form.playoff_result.trim() || null,
    };
    try {
      if (editId) { await db.season_history.update(editId, fields); }
      else        { await db.season_history.add(fields); }
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const inp = 'w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary';
  const lbl = 'block text-xs font-semibold text-slate-400 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">{editId ? 'Edit Season' : 'Add Season'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className={lbl}>Season Year *</label>
            <input className={inp} placeholder="2024-25" value={form.year} onChange={e => set('year', e.target.value)} />
          </div>

          <div>
            <label className={lbl}>Season Title</label>
            <input className={inp} placeholder="Conference Champions" value={form.title} onChange={e => set('title', e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Head Coach</label>
              <input className={inp} placeholder="Coach Smith" value={form.head_coach} onChange={e => set('head_coach', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Tenure Year #</label>
              <input className={inp} type="number" min="1" placeholder="3" value={form.tenure_year} onChange={e => set('tenure_year', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={lbl}>Assistant Coach</label>
            <input className={inp} placeholder="Coach Jones" value={form.asst_coach} onChange={e => set('asst_coach', e.target.value)} />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={lbl}>Games</label>
              <input className={inp} type="number" min="0" placeholder="32" value={form.games} onChange={e => set('games', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Wins</label>
              <input className={inp} type="number" min="0" placeholder="24" value={form.wins} onChange={e => set('wins', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Losses</label>
              <input className={inp} type="number" min="0" placeholder="8" value={form.losses} onChange={e => set('losses', e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>State Ranking</label>
              <input className={inp} type="number" min="1" placeholder="e.g. 3" value={form.state_rank} onChange={e => set('state_rank', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>National Ranking</label>
              <input className={inp} type="number" min="1" placeholder="e.g. 12" value={form.national_rank} onChange={e => set('national_rank', e.target.value)} />
            </div>
          </div>

          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold pt-1">Playoffs</p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={lbl}>Playoff Seed</label>
              <input className={inp} placeholder="#2" value={form.playoff_seed} onChange={e => set('playoff_seed', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Playoff Finish</label>
              <input className={inp} placeholder="Sectional Finals" value={form.state_finish} onChange={e => set('state_finish', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={lbl}>Playoff Result</label>
            <input className={inp} placeholder="Lost to Lincoln 0-3 in Sectional Finals" value={form.playoff_result} onChange={e => set('playoff_result', e.target.value)} />
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold active:scale-95 disabled:opacity-50"
        >
          {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Season'}
        </button>
      </div>
    </div>
  );
}

// ── College Commits ───────────────────────────────────────────────────────────

const DIV_COLORS = {
  'NCAA D1': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  'NCAA D2': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'NCAA D3': 'bg-slate-600/40 text-slate-300 border-slate-500/30',
  'NAIA':    'bg-green-500/20 text-green-300 border-green-500/30',
  'JUCO':    'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'Club':    'bg-slate-600/30 text-slate-400 border-slate-600/30',
};

const EMPTY_COMMIT = { player_name: '', grad_year: '', college: '', division: 'NCAA D1' };

function CommitModal({ teamId, onClose, editId, initialData }) {
  const [form, setForm] = useState(initialData ?? EMPTY_COMMIT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); setError(''); }

  async function handleSave() {
    if (!form.player_name.trim()) { setError('Player name is required.'); return; }
    if (!form.grad_year)          { setError('Graduation year is required.'); return; }
    if (!form.college.trim())     { setError('College name is required.'); return; }
    if (!form.division)           { setError('Division is required.'); return; }
    setSaving(true);
    const fields = {
      team_id:     teamId,
      player_name: form.player_name.trim(),
      grad_year:   Number(form.grad_year),
      college:     form.college.trim(),
      division:    form.division,
    };
    try {
      if (editId) { await db.player_commits.update(editId, fields); }
      else        { await db.player_commits.add(fields); }
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const inp = 'w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary';
  const lbl = 'block text-xs font-semibold text-slate-400 mb-1';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60" onClick={onClose}>
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[88vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">{editId ? 'Edit Commit' : 'Add Commit'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className={lbl}>Player Name *</label>
            <input className={inp} placeholder="Jane Smith" value={form.player_name} onChange={e => set('player_name', e.target.value)} />
          </div>

          <div>
            <label className={lbl}>Graduation Year *</label>
            <input className={inp} type="number" min="1990" max="2099" placeholder={String(new Date().getFullYear())} value={form.grad_year} onChange={e => set('grad_year', e.target.value)} />
          </div>

          <div>
            <label className={lbl}>College / University *</label>
            <input className={inp} placeholder="University of Michigan" value={form.college} onChange={e => set('college', e.target.value)} />
          </div>

          <div>
            <label className={lbl}>Division *</label>
            <select className={inp} value={form.division} onChange={e => set('division', e.target.value)}>
              {COLLEGE_DIVISIONS.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold active:scale-95 disabled:opacity-50"
        >
          {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Commit'}
        </button>
      </div>
    </div>
  );
}

function CommitCard({ entry, onEdit, onDelete }) {
  const divCls = DIV_COLORS[entry.division] ?? DIV_COLORS['Club'];
  const [offset, setOffset]     = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);
  const touchStartX = useRef(null);
  const hasSwiped   = useRef(false);
  const REVEAL = 130;

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    hasSwiped.current   = false;
    setIsSnapping(false);
  };
  const handleTouchMove = (e) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.touches[0].clientX;
    if (Math.abs(dx) > 5) hasSwiped.current = true;
    if (dx < 0) { setOffset(0); return; }
    setOffset(Math.min(dx, REVEAL + 16));
  };
  const handleTouchEnd = () => {
    setIsSnapping(true);
    setOffset(offset > REVEAL * 0.45 ? REVEAL : 0);
    touchStartX.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Revealed actions */}
      <div className="absolute inset-y-0 right-0 flex" style={{ width: REVEAL }}>
        <button
          onClick={() => { setOffset(0); setIsSnapping(true); onEdit(entry); }}
          className="flex-1 flex items-center justify-center bg-primary text-white text-xs font-bold"
        >
          Edit
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          className="flex-1 flex items-center justify-center bg-red-600 rounded-r-xl text-white text-xs font-bold"
        >
          Delete
        </button>
      </div>

      {/* Sliding card */}
      <div
        style={{
          transform:  `translateX(-${offset}px)`,
          transition: isSnapping ? 'transform 280ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
          willChange: 'transform',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClickCapture={(e) => {
          if (hasSwiped.current) { hasSwiped.current = false; e.stopPropagation(); }
        }}
      >
        <div className="bg-slate-800 rounded-xl px-4 py-3 border border-slate-700/50">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-slate-100 truncate">{entry.player_name}</span>
              <span className="text-xs text-slate-500 shrink-0">'{String(entry.grad_year).slice(-2)}</span>
            </div>
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 ${divCls}`}>{entry.division}</span>
          </div>
          <p className="text-sm text-slate-400 mt-0.5">{entry.college}</p>
        </div>
      </div>
    </div>
  );
}

// ── Live Season Card ──────────────────────────────────────────────────────────

// Shows the active season's W/L computed live from match data.
// Manual fields (coach, rankings, playoffs) are sourced from the matching
// season_history entry if one exists; otherwise those sections are blank.
// activeSeason: the season DB record (may have head_coach/asst_coach from the roster tab)
// historyEntry: matching season_history row (has title, rankings, playoffs, and possibly coach overrides)
function LiveSeasonCard({ year, matches, historyEntry, activeSeason, onEdit }) {
  const completed = (matches ?? []).filter(m => m.status === MATCH_STATUS.COMPLETE && m.match_type !== 'exhibition');
  const wins      = completed.filter(m => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
  const losses    = completed.filter(m => (m.our_sets_won ?? 0) < (m.opp_sets_won ?? 0)).length;
  const total     = completed.length;
  const winPct    = total > 0 ? fmtWinPct(wins, total) : null;

  // Coaches: prefer history entry (explicitly set in History → Edit Details),
  // fall back to season record (set from the roster tab)
  const headCoach  = historyEntry?.head_coach  ?? activeSeason?.head_coach  ?? null;
  const asstCoach  = historyEntry?.asst_coach  ?? activeSeason?.asst_coach  ?? null;
  const tenureYear = historyEntry?.tenure_year ?? activeSeason?.tenure_year ?? null;

  const hasCoach    = headCoach || asstCoach;
  const hasRankings = historyEntry?.state_rank != null || historyEntry?.national_rank != null;
  const hasPlayoffs = historyEntry?.playoff_seed || historyEntry?.state_finish || historyEntry?.playoff_result;

  return (
    <div className="rounded-xl overflow-hidden border border-primary/50 shadow-[0_0_16px_-4px_rgba(249,115,22,0.2)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-primary/10">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-base font-black text-white">{year ?? '—'}</span>
          {total > 0 && (
            <span className="text-sm font-bold text-slate-200 tabular-nums">
              {wins}–{losses}
              {winPct && <span className="text-xs text-slate-400 font-semibold ml-1.5">{winPct}</span>}
            </span>
          )}
          <span className="text-[10px] font-black uppercase tracking-widest text-primary border border-primary/40 px-2 py-0.5 rounded-full">
            LIVE
          </span>
        </div>
        <button
          onClick={onEdit}
          className="text-xs text-primary font-semibold px-2 py-1 rounded-lg hover:bg-slate-700/50 transition-colors shrink-0"
        >
          {historyEntry ? 'Edit' : '+ Details'}
        </button>
      </div>

      <div className="bg-slate-800 px-4 py-3 space-y-2.5">
        {historyEntry?.title && (
          <p className="text-base font-black text-primary tracking-wide">{historyEntry.title}</p>
        )}

        {hasRankings && (
          <div className="flex gap-4">
            {historyEntry.state_rank != null && (
              <span className="text-sm font-bold text-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1.5">State</span>
                #{historyEntry.state_rank}
              </span>
            )}
            {historyEntry.national_rank != null && (
              <span className="text-sm font-bold text-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1.5">National</span>
                #{historyEntry.national_rank}
              </span>
            )}
          </div>
        )}

        {total > 0 && (
          <p className="text-xs text-slate-500">{total} {total === 1 ? 'game' : 'games'} played</p>
        )}

        {hasCoach && (
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {headCoach && (
              <span className="text-sm text-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1.5">HC</span>
                {headCoach}
                {tenureYear != null && (
                  <span className="text-xs text-slate-500 ml-1.5">· Year {tenureYear}</span>
                )}
              </span>
            )}
            {asstCoach && (
              <span className="text-sm text-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1.5">AC</span>
                {asstCoach}
              </span>
            )}
          </div>
        )}

        {hasPlayoffs && (
          <div className="pt-2 border-t border-slate-700/60 space-y-1.5">
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {historyEntry.playoff_seed && (
                <span className="text-xs">
                  <span className="text-slate-500 mr-1">Seed</span>
                  <span className="text-slate-200 font-semibold">{historyEntry.playoff_seed}</span>
                </span>
              )}
              {historyEntry.state_finish && (
                <span className="text-xs">
                  <span className="text-slate-500 mr-1">Finish</span>
                  <span className="text-slate-200 font-semibold">{historyEntry.state_finish}</span>
                </span>
              )}
            </div>
            {historyEntry.playoff_result && (
              <p className="text-xs text-slate-400 italic">{historyEntry.playoff_result}</p>
            )}
          </div>
        )}

        {!historyEntry && (
          <p className="text-xs text-slate-600 italic">Tap + Details to add coach, rankings, and playoff info.</p>
        )}
      </div>
    </div>
  );
}

// ── Static Season Card ────────────────────────────────────────────────────────

function SeasonCard({ entry, onEdit, onDelete }) {
  const winPct     = fmtWinPct(entry.wins, entry.games);
  const hasCoach   = entry.head_coach || entry.asst_coach;
  const hasRecord  = entry.wins != null || entry.losses != null;
  const hasPlayoffs = entry.playoff_seed || entry.state_finish || entry.playoff_result;

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700/50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-700/40">
        <div className="flex items-center gap-3">
          <span className="text-base font-black text-white">{entry.year}</span>
          {hasRecord && (
            <span className="text-sm font-bold text-slate-200 tabular-nums">
              {entry.wins ?? '—'}–{entry.losses ?? '—'}
              {winPct && <span className="text-xs text-slate-400 font-semibold ml-1.5">{winPct}</span>}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onEdit(entry)}
            className="text-xs text-primary font-semibold px-2 py-1 rounded-lg hover:bg-slate-600/50 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(entry.id)}
            className="text-xs text-red-400 font-semibold px-2 py-1 rounded-lg hover:bg-slate-600/50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {entry.title && (
        <div className="px-4 pt-3 pb-0">
          <p className="text-base font-black text-primary tracking-wide">{entry.title}</p>
        </div>
      )}

      <div className="px-4 py-3 space-y-2.5">
        {/* Rankings */}
        {(entry.state_rank != null || entry.national_rank != null) && (
          <div className="flex gap-4">
            {entry.state_rank != null && (
              <span className="text-sm font-bold text-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1.5">State</span>
                #{entry.state_rank}
              </span>
            )}
            {entry.national_rank != null && (
              <span className="text-sm font-bold text-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1.5">National</span>
                #{entry.national_rank}
              </span>
            )}
          </div>
        )}

        {/* Games played */}
        {entry.games != null && (
          <p className="text-xs text-slate-500">{entry.games} games played</p>
        )}

        {/* Coaching */}
        {hasCoach && (
          <div className="flex flex-wrap gap-x-5 gap-y-1">
            {entry.head_coach && (
              <span className="text-sm text-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1.5">HC</span>
                {entry.head_coach}
                {entry.tenure_year != null && (
                  <span className="text-xs text-slate-500 ml-1.5">· Year {entry.tenure_year}</span>
                )}
              </span>
            )}
            {entry.asst_coach && (
              <span className="text-sm text-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1.5">AC</span>
                {entry.asst_coach}
              </span>
            )}
          </div>
        )}

        {/* Playoffs */}
        {hasPlayoffs && (
          <div className="pt-2 border-t border-slate-700/60 space-y-1.5">
            <div className="flex flex-wrap gap-x-5 gap-y-1">
              {entry.playoff_seed && (
                <span className="text-xs">
                  <span className="text-slate-500 mr-1">Seed</span>
                  <span className="text-slate-200 font-semibold">{entry.playoff_seed}</span>
                </span>
              )}
              {entry.state_finish && (
                <span className="text-xs">
                  <span className="text-slate-500 mr-1">Finish</span>
                  <span className="text-slate-200 font-semibold">{entry.state_finish}</span>
                </span>
              )}
            </div>
            {entry.playoff_result && (
              <p className="text-xs text-slate-400 italic">{entry.playoff_result}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function HistoryPage() {
  const [orgId,   setOrgId]   = useState(null);
  const [gender,  setGender]  = useState(null);
  const [teamId,  setTeamId]  = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState(null);
  const [showAddCommit, setShowAddCommit] = useState(false);
  const [editCommit,    setEditCommit]    = useState(null);
  const [liveEditOpen,  setLiveEditOpen]  = useState(false);

  // Default team/season from settings (read once — localStorage is synchronous)
  const defaultTeamId   = useMemo(() => getIntStorage(STORAGE_KEYS.DEFAULT_TEAM_ID),   []);
  const defaultSeasonId = useMemo(() => getIntStorage(STORAGE_KEYS.DEFAULT_SEASON_ID), []);

  const orgs = useLiveQuery(
    () => db.organizations.toArray().then(o => o.sort((a, b) => a.name?.localeCompare(b.name))),
    []
  );
  const orgTeams = useLiveQuery(
    () => orgId ? db.teams.where('org_id').equals(orgId).toArray() : Promise.resolve([]),
    [orgId]
  );
  const history = useLiveQuery(
    () => teamId
      ? db.season_history.where('team_id').equals(teamId).toArray()
      : Promise.resolve([]),
    [teamId]
  );
  const commits = useLiveQuery(
    () => teamId
      ? db.player_commits.where('team_id').equals(teamId).toArray()
      : Promise.resolve([]),
    [teamId]
  );

  // Live data for the active default season (only when viewing the default team)
  const isDefaultTeam = teamId != null && teamId === defaultTeamId;
  const activeSeason = useLiveQuery(
    () => defaultSeasonId && isDefaultTeam
      ? db.seasons.get(defaultSeasonId)
      : Promise.resolve(null),
    [defaultSeasonId, isDefaultTeam]
  );
  const activeMatches = useLiveQuery(
    () => defaultSeasonId && isDefaultTeam
      ? db.matches.where('season_id').equals(defaultSeasonId).toArray()
      : Promise.resolve([]),
    [defaultSeasonId, isDefaultTeam]
  );

  const genderTeams = useMemo(() => {
    const varsity = (orgTeams ?? []).filter(t => t.level === 'varsity');
    return {
      F: varsity.filter(t => t.gender === 'F'),
      M: varsity.filter(t => t.gender === 'M'),
    };
  }, [orgTeams]);

  // Auto-select the only org when there's just one
  useMemo(() => {
    if (orgs?.length === 1 && !orgId) setOrgId(orgs[0].id);
  }, [orgs, orgId]);

  useMemo(() => {
    if (!orgTeams?.length) return;
    const hasF = genderTeams.F.length > 0;
    const hasM = genderTeams.M.length > 0;
    if (hasF && !hasM && gender !== 'F') setGender('F');
    if (hasM && !hasF && gender !== 'M') setGender('M');
  }, [genderTeams, orgTeams?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useMemo(() => {
    if (!gender) { setTeamId(null); return; }
    const matching = genderTeams[gender] ?? [];
    if (matching.length === 1) setTeamId(matching[0].id);
    else if (matching.length === 0) setTeamId(null);
  }, [gender, genderTeams]);

  useMemo(() => { setGender(null); setTeamId(null); }, [orgId]);

  // One-time auto-select: jump to the default team when page opens with nothing selected
  useEffect(() => {
    if (!defaultTeamId || orgId) return;
    db.teams.get(defaultTeamId).then(team => {
      if (!team) return;
      setOrgId(team.org_id);
      setGender(team.gender ?? null);
      setTeamId(team.id);
    });
  }, [defaultTeamId]); // eslint-disable-line react-hooks/exhaustive-deps -- run only on mount

  // The history entry (if any) whose year matches the active season — folded into the live card
  const liveHistoryEntry = useMemo(() => {
    if (!activeSeason?.year || !history) return null;
    return history.find(h => String(h.year) === String(activeSeason.year)) ?? null;
  }, [activeSeason, history]);

  const sortedHistory = useMemo(() => {
    const activeYear = activeSeason?.year ? String(activeSeason.year) : null;
    return [...(history ?? [])]
      .filter(h => !activeYear || String(h.year) !== activeYear) // live card covers current year
      .sort((a, b) => String(b.year).localeCompare(String(a.year)));
  }, [history, activeSeason]);

  const sortedCommits = useMemo(
    () => [...(commits ?? [])].sort((a, b) => b.grad_year - a.grad_year),
    [commits]
  );

  async function handleDelete(id) {
    await db.season_history.delete(id);
  }

  async function handleDeleteCommit(id) {
    await db.player_commits.delete(id);
  }

  const multiTeam = gender ? (genderTeams[gender]?.length ?? 0) > 1 : false;
  const orgName   = orgs?.find(o => o.id === orgId)?.name ?? '';

  const selectCls = 'w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-primary';

  const GenderPill = ({ value, label }) => {
    const available = (genderTeams[value]?.length ?? 0) > 0;
    return (
      <button
        disabled={!available}
        onClick={() => { setGender(value); setTeamId(null); }}
        className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
          gender === value ? 'bg-primary text-white'
            : available ? 'text-slate-400 hover:text-slate-200'
            : 'text-slate-700 cursor-not-allowed'
        }`}
      >
        {label}
      </button>
    );
  };

  // Initial data for the live card's edit modal
  const liveEditInitial = liveHistoryEntry ? {
    year:           liveHistoryEntry.year           ?? activeSeason?.year ?? '',
    title:          liveHistoryEntry.title          ?? '',
    state_rank:     liveHistoryEntry.state_rank     != null ? String(liveHistoryEntry.state_rank)    : '',
    national_rank:  liveHistoryEntry.national_rank  != null ? String(liveHistoryEntry.national_rank) : '',
    head_coach:     liveHistoryEntry.head_coach     ?? '',
    tenure_year:    liveHistoryEntry.tenure_year    != null ? String(liveHistoryEntry.tenure_year) : '',
    asst_coach:     liveHistoryEntry.asst_coach     ?? '',
    games:          '',
    wins:           '',
    losses:         '',
    playoff_seed:   liveHistoryEntry.playoff_seed   ?? '',
    regional:       liveHistoryEntry.regional       ?? '',
    sectional:      liveHistoryEntry.sectional      ?? '',
    state_finish:   liveHistoryEntry.state_finish   ?? '',
    playoff_result: liveHistoryEntry.playoff_result ?? '',
  } : {
    ...EMPTY_FORM,
    year: activeSeason?.year ?? '',
  };

  const showLiveCard = isDefaultTeam && activeSeason != null;

  const programRecord = useMemo(() => {
    let wins = 0;
    let losses = 0;
    for (const h of sortedHistory) {
      wins   += h.wins   ?? 0;
      losses += h.losses ?? 0;
    }
    if (showLiveCard) {
      const completed = (activeMatches ?? []).filter(
        m => m.status === MATCH_STATUS.COMPLETE && m.match_type !== 'exhibition'
      );
      wins   += completed.filter(m => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
      losses += completed.filter(m => (m.our_sets_won ?? 0) < (m.opp_sets_won ?? 0)).length;
    }
    const total  = wins + losses;
    const winPct = total > 0 ? fmtWinPct(wins, total) : null;
    return { wins, losses, total, winPct };
  }, [sortedHistory, activeMatches, showLiveCard]);

  const coachRecords = useMemo(() => {
    const map = {};
    for (const h of sortedHistory) {
      const name = h.head_coach?.trim();
      if (!name) continue;
      if (!map[name]) map[name] = { wins: 0, losses: 0, maxYear: 0 };
      map[name].wins    += h.wins   ?? 0;
      map[name].losses  += h.losses ?? 0;
      map[name].maxYear  = Math.max(map[name].maxYear, Number(h.year) || 0);
    }
    if (showLiveCard) {
      const name = (liveHistoryEntry?.head_coach ?? activeSeason?.head_coach)?.trim();
      if (name) {
        if (!map[name]) map[name] = { wins: 0, losses: 0, maxYear: 0 };
        map[name].maxYear = Math.max(map[name].maxYear, Number(activeSeason?.year) || 9999);
        const completed = (activeMatches ?? []).filter(
          m => m.status === MATCH_STATUS.COMPLETE && m.match_type !== 'exhibition'
        );
        map[name].wins   += completed.filter(m => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
        map[name].losses += completed.filter(m => (m.our_sets_won ?? 0) < (m.opp_sets_won ?? 0)).length;
      }
    }
    return Object.entries(map)
      .map(([name, { wins, losses, maxYear }]) => ({
        name, wins, losses, maxYear,
        total:  wins + losses,
        winPct: wins + losses > 0 ? fmtWinPct(wins, wins + losses) : null,
      }))
      .sort((a, b) => b.maxYear - a.maxYear);
  }, [sortedHistory, activeMatches, showLiveCard, liveHistoryEntry, activeSeason]);

  const asstCoachRecords = useMemo(() => {
    const map = {};
    for (const h of sortedHistory) {
      const name = h.asst_coach?.trim();
      if (!name) continue;
      if (!map[name]) map[name] = { wins: 0, losses: 0, maxYear: 0 };
      map[name].wins    += h.wins   ?? 0;
      map[name].losses  += h.losses ?? 0;
      map[name].maxYear  = Math.max(map[name].maxYear, Number(h.year) || 0);
    }
    if (showLiveCard) {
      const name = (liveHistoryEntry?.asst_coach ?? activeSeason?.asst_coach)?.trim();
      if (name) {
        if (!map[name]) map[name] = { wins: 0, losses: 0, maxYear: 0 };
        map[name].maxYear = Math.max(map[name].maxYear, Number(activeSeason?.year) || 9999);
        const completed = (activeMatches ?? []).filter(
          m => m.status === MATCH_STATUS.COMPLETE && m.match_type !== 'exhibition'
        );
        map[name].wins   += completed.filter(m => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
        map[name].losses += completed.filter(m => (m.our_sets_won ?? 0) < (m.opp_sets_won ?? 0)).length;
      }
    }
    return Object.entries(map)
      .map(([name, { wins, losses, maxYear }]) => ({
        name, wins, losses, maxYear,
        total:  wins + losses,
        winPct: wins + losses > 0 ? fmtWinPct(wins, wins + losses) : null,
      }))
      .sort((a, b) => b.maxYear - a.maxYear);
  }, [sortedHistory, activeMatches, showLiveCard, liveHistoryEntry, activeSeason]);

  return (
    <div className="pb-24">
      <PageHeader
        title={orgName ? `History — ${orgName}` : 'History'}
        action={teamId && (
          <button
            onClick={() => setShowAdd(true)}
            className="px-3 py-1 rounded-lg bg-primary text-white text-sm font-bold"
          >
            + Season
          </button>
        )}
      />

      <div className="p-4 space-y-4">
        {orgs && orgs.length > 1 && (
          <select value={orgId ?? ''} onChange={e => setOrgId(Number(e.target.value))} className={selectCls}>
            <option value="">Select a school…</option>
            {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        )}

        {!orgId ? (
          <EmptyState icon="📖" title="Select a school" description="Choose a school to view program history" />
        ) : (
          <>
            <div className="flex bg-slate-800 rounded-xl p-1 gap-1">
              <GenderPill value="F" label="Girls" />
              <GenderPill value="M" label="Boys" />
            </div>

            {multiTeam && (
              <select
                value={teamId ?? ''}
                onChange={e => setTeamId(Number(e.target.value))}
                className={selectCls}
              >
                <option value="">Select a team…</option>
                {(genderTeams[gender] ?? []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            )}

            {!teamId ? (
              <EmptyState icon="📋" title={gender ? 'Select a team' : 'Select Girls or Boys'} description="" />
            ) : (
              <>
                {/* College Commits */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs font-bold uppercase tracking-wide text-slate-400">College Commits</h3>
                    <button
                      onClick={() => setShowAddCommit(true)}
                      className="text-xs text-primary font-semibold px-2 py-1 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                      + Add
                    </button>
                  </div>
                  {sortedCommits.length === 0 ? (
                    <p className="text-xs text-slate-500 italic">No commits recorded yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {sortedCommits.map(c => (
                        <CommitCard
                          key={c.id}
                          entry={c}
                          onEdit={setEditCommit}
                          onDelete={handleDeleteCommit}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Program Overall Record */}
                {programRecord.total > 0 && (
                  <div className="bg-surface rounded-xl px-4 py-3">
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Program Overall Record</p>
                    <div className="grid grid-cols-3 divide-x divide-slate-700/60">
                      <div className="text-center pr-3">
                        <div className="text-2xl font-black text-emerald-400 tabular-nums leading-none">{programRecord.wins}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mt-1">Wins</div>
                      </div>
                      <div className="text-center px-3">
                        <div className="text-2xl font-black text-red-400 tabular-nums leading-none">{programRecord.losses}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-red-800 mt-1">Losses</div>
                      </div>
                      <div className="text-center pl-3">
                        <div className="text-2xl font-black text-primary tabular-nums leading-none">{programRecord.winPct ?? '—'}</div>
                        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Win%</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Head Coach + Asst Coach Records */}
                {(coachRecords.length > 0 || asstCoachRecords.length > 0) && (
                  <div className="bg-surface rounded-xl px-4 py-3 space-y-3">
                    {coachRecords.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Head Coach Records</p>
                        <div className="space-y-2">
                          {coachRecords.map(({ name, wins, losses, winPct }) => (
                            <div key={name} className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-200 truncate">{name}</span>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-sm font-black tabular-nums">
                                  <span className="text-emerald-400">{wins}</span>
                                  <span className="text-slate-600 mx-0.5">–</span>
                                  <span className="text-red-400">{losses}</span>
                                </span>
                                {winPct && (
                                  <span className="text-xs font-bold text-primary tabular-nums w-14 text-right">{winPct}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {coachRecords.length > 0 && asstCoachRecords.length > 0 && (
                      <div className="border-t border-slate-700/60" />
                    )}
                    {asstCoachRecords.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Assistant Coach Records</p>
                        <div className="space-y-2">
                          {asstCoachRecords.map(({ name, wins, losses, winPct }) => (
                            <div key={name} className="flex items-center justify-between gap-2">
                              <span className="text-sm font-semibold text-slate-200 truncate">{name}</span>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-sm font-black tabular-nums">
                                  <span className="text-emerald-400">{wins}</span>
                                  <span className="text-slate-600 mx-0.5">–</span>
                                  <span className="text-red-400">{losses}</span>
                                </span>
                                {winPct && (
                                  <span className="text-xs font-bold text-primary tabular-nums w-14 text-right">{winPct}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Season History */}
                <div className="space-y-3">
                  {/* Live card for the active/default season */}
                  {showLiveCard && (
                    <LiveSeasonCard
                      year={activeSeason.year}
                      matches={activeMatches}
                      historyEntry={liveHistoryEntry}
                      activeSeason={activeSeason}
                      onEdit={() => setLiveEditOpen(true)}
                    />
                  )}

                  {/* Manually-entered past seasons (active year is folded into the live card) */}
                  {sortedHistory.length === 0 && !showLiveCard ? (
                    <EmptyState
                      icon="📖"
                      title="No seasons recorded"
                      description="Tap + Season to start building your program's history"
                    />
                  ) : sortedHistory.length === 0 && showLiveCard ? null : (
                    sortedHistory.map(entry => (
                      <SeasonCard
                        key={entry.id}
                        entry={entry}
                        onEdit={setEditEntry}
                        onDelete={handleDelete}
                      />
                    ))
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {showAdd && teamId && (
        <HistoryModal teamId={teamId} onClose={() => setShowAdd(false)} />
      )}

      {showAddCommit && teamId && (
        <CommitModal teamId={teamId} onClose={() => setShowAddCommit(false)} />
      )}

      {editCommit && teamId && (
        <CommitModal
          teamId={teamId}
          editId={editCommit.id}
          initialData={{
            player_name: editCommit.player_name ?? '',
            grad_year:   editCommit.grad_year   != null ? String(editCommit.grad_year) : '',
            college:     editCommit.college     ?? '',
            division:    editCommit.division    ?? 'NCAA D1',
          }}
          onClose={() => setEditCommit(null)}
        />
      )}

      {editEntry && teamId && (
        <HistoryModal
          teamId={teamId}
          editId={editEntry.id}
          initialData={{
            year:           editEntry.year           ?? '',
            title:          editEntry.title          ?? '',
            state_rank:     editEntry.state_rank     != null ? String(editEntry.state_rank)    : '',
            national_rank:  editEntry.national_rank  != null ? String(editEntry.national_rank) : '',
            head_coach:     editEntry.head_coach     ?? '',
            tenure_year:    editEntry.tenure_year    != null ? String(editEntry.tenure_year) : '',
            asst_coach:     editEntry.asst_coach     ?? '',
            games:          editEntry.games          != null ? String(editEntry.games)   : '',
            wins:           editEntry.wins           != null ? String(editEntry.wins)    : '',
            losses:         editEntry.losses         != null ? String(editEntry.losses)  : '',
            playoff_seed:   editEntry.playoff_seed   ?? '',
            regional:       editEntry.regional       ?? '',
            sectional:      editEntry.sectional      ?? '',
            state_finish:   editEntry.state_finish   ?? '',
            playoff_result: editEntry.playoff_result ?? '',
          }}
          onClose={() => setEditEntry(null)}
        />
      )}

      {/* Live card edit modal — creates or updates the matching season_history entry */}
      {liveEditOpen && teamId && activeSeason && (
        <HistoryModal
          teamId={teamId}
          editId={liveHistoryEntry?.id}
          initialData={liveEditInitial}
          onClose={() => setLiveEditOpen(false)}
        />
      )}
    </div>
  );
}
