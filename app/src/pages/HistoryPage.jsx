import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { db } from '../db/schema';
import { COLLEGE_DIVISIONS, MATCH_STATUS, SCHOOL_YEAR_CLS } from '../constants';
import { STORAGE_KEYS, getIntStorage, getStorageItem } from '../utils/storage';
import { PageHeader } from '../components/layout/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { toTitleArr, ordinal, titlePriority } from '../utils/historyUtils';
import { ChampionshipBannersSection } from '../components/shared/ChampionshipBanner';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { PostSeasonModal } from '../components/shared/PostSeasonModal';
import { applyInferredSeasonFinish } from '../utils/seasonUtils';

// ── helpers ───────────────────────────────────────────────────────────────────

function fmtWinPct(wins, games) {
  if (wins == null || !games) return null;
  return (wins / games * 100).toFixed(1) + '%';
}

const PLAYOFF_ROUND_ORDER = ['regional', 'sectional', 'super-sectional', 'quarterfinal', 'semifinal', 'state championship'];

function roundOrderIndex(roundName) {
  const lower = (roundName ?? '').toLowerCase();
  const exact = PLAYOFF_ROUND_ORDER.findIndex(r => lower === r);
  if (exact !== -1) return exact;
  return PLAYOFF_ROUND_ORDER.findIndex(r => lower.includes(r));
}

function inferFinishFromPlayoffRounds(playoffRounds) {
  if (!playoffRounds?.length) return '';
  const sorted = [...playoffRounds]
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

function inferFinishFromMatches(matches) {
  const playoffs = (matches ?? []).filter(
    m => m.status === MATCH_STATUS.COMPLETE && m.match_type === 'ihsa-playoffs' && m.playoff_round
  );
  if (!playoffs.length) return '';
  const rounds = playoffs.map(m => ({
    round:  m.playoff_round,
    result: (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0) ? 'W' : 'L',
  }));
  return inferFinishFromPlayoffRounds(rounds);
}

// ── Shared swipe-to-reveal hook ───────────────────────────────────────────────

function useSwipeReveal(REVEAL = 130) {
  const [offset, setOffset]     = useState(0);
  const [isSnapping, setIsSnapping] = useState(false);
  const touchStartX = useRef(null);
  const hasSwiped   = useRef(false);

  const handleTouchStart = useCallback((e) => {
    touchStartX.current = e.touches[0].clientX;
    hasSwiped.current   = false;
    setIsSnapping(false);
  }, []);
  const handleTouchMove = useCallback((e) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.touches[0].clientX;
    if (Math.abs(dx) > 5) hasSwiped.current = true;
    if (dx < 0) { setOffset(0); return; }
    setOffset(Math.min(dx, REVEAL + 16));
  }, [REVEAL]);
  const handleTouchEnd = useCallback(() => {
    setIsSnapping(true);
    setOffset(prev => prev > REVEAL * 0.45 ? REVEAL : 0);
    touchStartX.current = null;
  }, [REVEAL]);
  const reset = useCallback(() => { setOffset(0); setIsSnapping(true); }, []);
  const clickCapture = useCallback((e) => {
    if (hasSwiped.current) { hasSwiped.current = false; e.stopPropagation(); }
  }, []);

  const slideStyle = {
    transform:  `translateX(-${offset}px)`,
    transition: isSnapping ? 'transform 280ms cubic-bezier(0.25, 1, 0.5, 1)' : 'none',
    willChange: 'transform',
  };

  return { offset, slideStyle, handleTouchStart, handleTouchMove, handleTouchEnd, clickCapture, reset };
}

// ── Shared coach-records builder ──────────────────────────────────────────────

function computeCoachRecords(sortedHistory, field, { hasActiveSeason, activeSeasonYear, activeMatches, liveHistoryEntry, activeSeason }) {
  const map = {};
  for (const h of sortedHistory) {
    if (activeSeasonYear && String(h.year) === activeSeasonYear) continue;
    const name = h[field]?.trim();
    if (!name) continue;
    if (!map[name]) map[name] = { wins: 0, losses: 0, minYear: Infinity, maxYear: 0, isPresent: false };
    map[name].wins   += h.wins   ?? 0;
    map[name].losses += h.losses ?? 0;
    const yr = Number(h.year) || 0;
    map[name].minYear = Math.min(map[name].minYear, yr);
    map[name].maxYear = Math.max(map[name].maxYear, yr);
  }
  if (hasActiveSeason) {
    const name = (liveHistoryEntry?.[field] ?? activeSeason?.[field])?.trim();
    if (name) {
      if (!map[name]) map[name] = { wins: 0, losses: 0, minYear: Infinity, maxYear: 0, isPresent: false };
      const yr = Number(activeSeason?.year) || 0;
      map[name].minYear = Math.min(map[name].minYear, yr);
      map[name].maxYear = Math.max(map[name].maxYear, yr != null ? yr : 9999);
      map[name].isPresent = true;
      const completed = (activeMatches ?? []).filter(
        m => m.status === MATCH_STATUS.COMPLETE && m.match_type !== 'exhibition'
      );
      map[name].wins   += completed.filter(m => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
      map[name].losses += completed.filter(m => (m.our_sets_won ?? 0) < (m.opp_sets_won ?? 0)).length;
    }
  }
  return Object.entries(map)
    .map(([name, { wins, losses, minYear, maxYear, isPresent }]) => {
      const min = minYear === Infinity ? 0 : minYear;
      const yearLabel = isPresent
        ? (min && min !== maxYear ? `${min}–present` : 'present')
        : (min && min !== maxYear ? `${min}–${maxYear}` : (min ? String(min) : null));
      return { name, wins, losses, maxYear, yearLabel, total: wins + losses, winPct: wins + losses > 0 ? fmtWinPct(wins, wins + losses) : null };
    })
    .sort((a, b) => b.maxYear - a.maxYear);
}

// ── Add / Edit Modal ──────────────────────────────────────────────────────────

const EMPTY_ROUND = { round: '', opponent: '', result: 'W', score: '', opp_seed: '' };

const EMPTY_FORM = {
  year: '', title: [], classification: '', head_coach: '', tenure_year: '', asst_coach: '',
  games: '', wins: '', losses: '',
  state_rank: '', national_rank: '', class_rank: '',
  playoff_seed: '', state_finish: '', playoff_result: '',
  playoff_rounds: [],
};

function HistoryModal({ teamId, onClose, editId, initialData, liveMode = false }) {
  const [form, setForm] = useState(initialData ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); setError(''); }

  async function handleSave() {
    const yearStr = String(form.year ?? '').trim();
    if (!yearStr) { setError('Season year is required.'); return; }
    setSaving(true);
    try {
      const newStateRank    = form.state_rank    ? Number(form.state_rank)    : null;
      const newNationalRank = form.national_rank ? Number(form.national_rank) : null;

      // Resolve the target record: prefer the explicit editId, but fall back to
      // any existing entry with the same (team_id, year) so we never create
      // duplicate entries. Duplicates cause prev_state_rank to always track from
      // the first-ever value instead of the most-recent one.
      const resolvedId = editId ?? (
        await db.season_history
          .where('team_id').equals(teamId)
          .filter(h => String(h.year) === yearStr)
          .first()
      )?.id ?? null;

      let prevRanks = {};
      if (resolvedId) {
        const existing = await db.season_history.get(resolvedId);
        if (existing) {
          if (newStateRank !== existing.state_rank)
            prevRanks.prev_state_rank = existing.state_rank ?? null;
          if (newNationalRank !== existing.national_rank)
            prevRanks.prev_national_rank = existing.national_rank ?? null;
        }
      }
      const fields = {
        team_id:        teamId,
        year:           yearStr,
        title:          (() => { const arr = toTitleArr(form.title).map(s => s.trim()).filter(Boolean); return arr.length ? arr : null; })(),
        classification: (form.classification ?? '').trim() || null,
        head_coach:     form.head_coach.trim()           || null,
        asst_coach:     form.asst_coach.trim()           || null,
        tenure_year:    form.tenure_year  ? Number(form.tenure_year)  : null,
        games:          form.games        ? Number(form.games)        : null,
        wins:           form.wins         ? Number(form.wins)         : null,
        losses:         form.losses       ? Number(form.losses)       : null,
        state_rank:     newStateRank,
        national_rank:  newNationalRank,
        class_rank:     (form.class_rank ?? '').trim()   || null,
        playoff_seed:   form.playoff_seed.trim()         || null,
        state_finish:   form.state_finish.trim()         || null,
        playoff_result: form.playoff_result.trim()       || null,
        playoff_rounds: (form.playoff_rounds ?? []).filter(r => r.round?.trim() || r.opponent?.trim()),
        ...prevRanks,
      };
      if (resolvedId) { await db.season_history.update(resolvedId, fields); }
      else             { await db.season_history.add(fields); }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">
            {liveMode ? 'Current Season Details' : editId ? 'Edit Season' : 'Add Season'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>

        <div className="space-y-3">
          {liveMode ? (
            <div>
              <label className={lbl}>Season Year</label>
              <p className="text-sm font-bold text-slate-200 py-2">{form.year || '—'}</p>
            </div>
          ) : (
            <div>
              <label className={lbl}>Season Year *</label>
              <input className={inp} placeholder="2024-25" value={form.year} onChange={e => set('year', e.target.value)} />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className={lbl}>Titles &amp; Championships</label>
            </div>
            <div className="space-y-1.5">
              {(form.title ?? []).map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    className={`${inp} flex-1`}
                    placeholder="e.g. Conference Champions"
                    value={t}
                    onChange={e => {
                      const updated = [...(form.title ?? [])];
                      updated[i] = e.target.value;
                      set('title', updated);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => set('title', (form.title ?? []).filter((_, j) => j !== i))}
                    className="text-slate-500 hover:text-red-400 text-xl leading-none px-1 shrink-0"
                  >×</button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => set('title', [...(form.title ?? []), ''])}
                className="w-full py-1.5 rounded-lg border border-dashed border-slate-600 text-xs text-slate-400 hover:text-white hover:border-slate-400 transition-colors"
              >+ Add Title</button>
            </div>
          </div>

          <div>
            <label className={lbl}>Class <span className="text-slate-600 font-normal">(optional)</span></label>
            <input className={inp} placeholder="e.g. 4A" value={form.classification} onChange={e => set('classification', e.target.value)} />
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

          {!liveMode && (
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
          )}

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className={lbl}>State Rank</label>
              <input className={inp} type="number" min="1" placeholder="e.g. 3" value={form.state_rank} onChange={e => set('state_rank', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>National Rank</label>
              <input className={inp} type="number" min="1" placeholder="e.g. 12" value={form.national_rank} onChange={e => set('national_rank', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Class Rank</label>
              <input className={inp} placeholder="e.g. 1" value={form.class_rank} onChange={e => set('class_rank', e.target.value)} />
            </div>
          </div>

          <p className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold pt-1">Playoffs</p>

          <div>
            <label className={lbl}>Our Playoff Seed</label>
            <input className={inp} placeholder="#2" value={form.playoff_seed} onChange={e => set('playoff_seed', e.target.value)} />
          </div>

          {/* Playoff rounds */}
          <div className="space-y-2">
            <label className={lbl}>Playoff Rounds</label>
            <datalist id="round-presets">
              {['Regional','Sectional','Super-Sectional','Quarterfinal','Semifinal','State Championship','First Round','Second Round'].map(r => (
                <option key={r} value={r} />
              ))}
            </datalist>
            {(form.playoff_rounds ?? []).map((r, i) => {
              const setRound = (field, val) => {
                const updated = form.playoff_rounds.map((x, j) => j === i ? { ...x, [field]: val } : x);
                set('playoff_rounds', updated);
              };
              return (
                <div key={i} className="bg-slate-800 rounded-lg p-2 space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <input
                      list="round-presets"
                      className={`${inp} flex-1`}
                      placeholder="Round (e.g. Regional)"
                      value={r.round}
                      onChange={e => setRound('round', e.target.value)}
                    />
                    <div className="flex rounded-lg overflow-hidden border border-slate-600 shrink-0">
                      <button
                        type="button"
                        onClick={() => setRound('result', 'W')}
                        className={`px-2.5 py-1.5 text-xs font-black transition-colors ${r.result === 'W' ? 'bg-emerald-700 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                      >W</button>
                      <button
                        type="button"
                        onClick={() => setRound('result', 'L')}
                        className={`px-2.5 py-1.5 text-xs font-black transition-colors ${r.result === 'L' ? 'bg-red-700 text-white' : 'bg-slate-700 text-slate-400 hover:text-white'}`}
                      >L</button>
                    </div>
                    <button
                      type="button"
                      onClick={() => set('playoff_rounds', form.playoff_rounds.filter((_, j) => j !== i))}
                      className="text-slate-500 hover:text-red-400 text-lg leading-none px-1 shrink-0"
                    >×</button>
                  </div>
                  <div className="flex items-end gap-1.5">
                    <div className="flex-1 min-w-0">
                      <label className={lbl}>Opponent</label>
                      <input
                        className={inp}
                        placeholder="e.g. Lincoln-Way Central"
                        value={r.opponent}
                        onChange={e => setRound('opponent', e.target.value)}
                      />
                    </div>
                    <div className="w-14 shrink-0">
                      <label className={lbl}>Seed</label>
                      <input
                        className={inp}
                        placeholder="#"
                        value={r.opp_seed}
                        onChange={e => setRound('opp_seed', e.target.value)}
                      />
                    </div>
                    <div className="w-16 shrink-0">
                      <label className={lbl}>Score</label>
                      <input
                        className={inp}
                        placeholder="3-1"
                        value={r.score}
                        onChange={e => setRound('score', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            <button
              type="button"
              onClick={() => set('playoff_rounds', [...(form.playoff_rounds ?? []), { ...EMPTY_ROUND }])}
              className="w-full py-1.5 rounded-lg border border-dashed border-slate-600 text-xs text-slate-400 hover:text-white hover:border-slate-400 transition-colors"
            >
              + Add Round
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold active:scale-95 disabled:opacity-50"
        >
          {saving ? 'Saving…' : liveMode ? 'Save Details' : editId ? 'Save Changes' : 'Add Season'}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto"
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
  const REVEAL = 130;
  const { slideStyle, handleTouchStart, handleTouchMove, handleTouchEnd, clickCapture, reset } = useSwipeReveal(REVEAL);

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: REVEAL }}>
        <button onClick={() => { reset(); onEdit(entry); }} className="flex-1 flex items-center justify-center bg-primary text-white text-xs font-bold">Edit</button>
        <button onClick={() => onDelete(entry)} className="flex-1 flex items-center justify-center bg-red-600 rounded-r-xl text-white text-xs font-bold">Delete</button>
      </div>
      <div style={slideStyle} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd} onClickCapture={clickCapture}>
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

// ── Individual Awards ─────────────────────────────────────────────────────────

const SCHOOL_YEARS = ['Freshman', 'Sophomore', 'Junior', 'Senior'];
const EMPTY_AWARD_TYPE = { name: '' };
const EMPTY_WINNER = { player_name: '', year: '', school_year: '', times_won: '1' };

function AwardTypeModal({ teamId, onClose, editId, initialData }) {
  const [form, setForm] = useState(initialData ?? EMPTY_AWARD_TYPE);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inp = 'w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary';
  const lbl = 'block text-xs font-semibold text-slate-400 mb-1';

  async function handleSave() {
    const name = (form.name ?? '').trim();
    if (!name) { setError('Award name is required.'); return; }
    setSaving(true);
    try {
      if (editId) { await db.accolade_types.update(editId, { name }); }
      else        { await db.accolade_types.add({ team_id: teamId, name, sort_order: Date.now() }); }
      onClose();
    } catch { setError('Failed to save. Please try again.'); }
    finally  { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">{editId ? 'Rename Award' : 'New Award'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div>
          <label className={lbl}>Award Name *</label>
          <input
            className={inp}
            placeholder="e.g. All Conference"
            value={form.name}
            onChange={e => { setForm(f => ({ ...f, name: e.target.value })); setError(''); }}
            autoFocus
          />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button onClick={handleSave} disabled={saving} className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold active:scale-95 disabled:opacity-50">
          {saving ? 'Saving…' : editId ? 'Save Changes' : 'Create Award'}
        </button>
      </div>
    </div>
  );
}

function AwardWinnerModal({ teamId, typeId, onClose, editId, initialData }) {
  const [form, setForm] = useState(initialData ?? EMPTY_WINNER);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field, val) { setForm(f => ({ ...f, [field]: val })); setError(''); }

  const inp = 'w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary';
  const lbl = 'block text-xs font-semibold text-slate-400 mb-1';

  async function handleSave() {
    if (!form.player_name.trim()) { setError('Player name is required.'); return; }
    if (!form.year.trim())        { setError('Year won is required.'); return; }
    setSaving(true);
    const fields = {
      type_id:     typeId,
      team_id:     teamId,
      player_name: form.player_name.trim(),
      year:        form.year.trim(),
      school_year: form.school_year || null,
      times_won:   form.times_won ? Number(form.times_won) : 1,
    };
    try {
      if (editId) { await db.accolade_winners.update(editId, fields); }
      else        { await db.accolade_winners.add(fields); }
      onClose();
    } catch { setError('Failed to save. Please try again.'); }
    finally  { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-100">{editId ? 'Edit Winner' : 'Add Winner'}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={lbl}>Player Name *</label>
            <input className={inp} placeholder="Jane Smith" value={form.player_name} onChange={e => set('player_name', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Year Won *</label>
            <input className={inp} placeholder="2024-25" value={form.year} onChange={e => set('year', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Year in School</label>
            <select className={inp} value={form.school_year} onChange={e => set('school_year', e.target.value)}>
              <option value="">— Select —</option>
              {SCHOOL_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Times Won</label>
            <input className={inp} type="number" min="1" placeholder="1" value={form.times_won} onChange={e => set('times_won', e.target.value)} />
          </div>
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        <button onClick={handleSave} disabled={saving} className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold active:scale-95 disabled:opacity-50">
          {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Winner'}
        </button>
      </div>
    </div>
  );
}

function WinnerCard({ entry, onEdit, onDelete }) {
  const REVEAL = 130;
  const { slideStyle, handleTouchStart, handleTouchMove, handleTouchEnd, clickCapture, reset } = useSwipeReveal(REVEAL);

  return (
    <div className="relative overflow-hidden rounded-xl">
      <div className="absolute inset-y-0 right-0 flex" style={{ width: REVEAL }}>
        <button onClick={() => { reset(); onEdit(entry); }} className="flex-1 flex items-center justify-center bg-primary text-white text-xs font-bold">Edit</button>
        <button onClick={() => onDelete(entry)} className="flex-1 flex items-center justify-center bg-red-600 rounded-r-xl text-white text-xs font-bold">Delete</button>
      </div>
      <div
        style={slideStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClickCapture={clickCapture}
      >
        <div className="bg-slate-800 rounded-xl px-4 py-3 border border-slate-700/50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-100">{entry.player_name}</span>
            <span className="text-xs text-slate-500">'{String(entry.year).slice(-2)}</span>
            {entry.school_year && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${SCHOOL_YEAR_CLS[entry.school_year] ?? 'bg-slate-700/60 text-slate-300 border-slate-600/50'}`}>{entry.school_year}</span>
            )}
            {entry.times_won > 1 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-primary/20 text-primary border-primary/30">×{entry.times_won}</span>
            )}
          </div>
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
function LiveSeasonCard({ year, matches, historyEntry, activeSeason, onEdit, onEndSeason, isWinRecord, isStateRankRecord, isNationalRankRecord, isWinsAddedRecord, isMostGamesRecord }) {
  const completed = (matches ?? []).filter(m => m.status === MATCH_STATUS.COMPLETE && m.match_type !== 'exhibition');
  const wins      = completed.filter(m => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
  const losses    = completed.filter(m => (m.our_sets_won ?? 0) < (m.opp_sets_won ?? 0)).length;
  const total     = completed.length;
  const winPct    = total > 0 ? fmtWinPct(wins, total) : null;

  // Coaches: prefer history entry (explicitly set in History → Edit Details),
  // fall back to season record (set from the roster tab)
  const headCoach  = historyEntry?.head_coach  || activeSeason?.head_coach  || null;
  const asstCoach  = historyEntry?.asst_coach  || activeSeason?.asst_coach  || null;
  const tenureYear = historyEntry?.tenure_year ?? activeSeason?.tenure_year ?? null;

  const hasCoach    = headCoach || asstCoach;
  const hasRankings = historyEntry?.state_rank != null || historyEntry?.national_rank != null || historyEntry?.class_rank != null;
  const hasPlayoffs = historyEntry?.playoff_seed || historyEntry?.state_finish || historyEntry?.playoff_result || (historyEntry?.playoff_rounds?.length > 0);

  return (
    <div className="rounded-xl overflow-hidden border border-primary/50 shadow-[0_0_16px_-4px_rgba(249,115,22,0.2)]">
      {/* Header */}
      <div className="px-4 py-3 bg-primary/10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-base font-black text-white">{year ?? '—'}</span>
            {historyEntry?.classification && (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{historyEntry.classification}</span>
            )}
            {total > 0 && (
              <span className="text-sm font-bold text-slate-200 tabular-nums">
                {wins}–{losses}
                {winPct && <span className="text-xs text-slate-400 font-semibold ml-1.5">{winPct}</span>}
              </span>
            )}
            {activeSeason?.status !== 'ended' ? (
              <span className="text-[10px] font-black uppercase tracking-widest text-primary border border-primary/40 px-2 py-0.5 rounded-full">
                CURRENT
              </span>
            ) : (
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 border border-slate-600 px-2 py-0.5 rounded-full">
                DONE
              </span>
            )}
            {activeSeason?.status !== 'ended' && onEndSeason && (
              <button
                onClick={onEndSeason}
                className="text-[10px] font-semibold text-slate-500 hover:text-red-400 border border-slate-600 hover:border-red-700/60 px-2 py-0.5 rounded-full transition-colors"
              >
                End Season
              </button>
            )}
          </div>
          <button
            onClick={onEdit}
            className="text-xs text-primary font-semibold px-2 py-1 rounded-lg hover:bg-slate-700/50 transition-colors shrink-0"
          >
            {historyEntry ? 'Edit' : '+ Details'}
          </button>
        </div>
        {(isWinRecord || isStateRankRecord || isNationalRankRecord || isWinsAddedRecord || isMostGamesRecord) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {isWinRecord        && <span className="text-[9px] font-black uppercase tracking-wide text-amber-400 border border-amber-500/50 px-1.5 py-0.5 rounded-full">Most Wins</span>}
            {isStateRankRecord  && <span className="text-[9px] font-black uppercase tracking-wide text-sky-400 border border-sky-500/50 px-1.5 py-0.5 rounded-full">Best State Rank</span>}
            {isNationalRankRecord && <span className="text-[9px] font-black uppercase tracking-wide text-violet-400 border border-violet-500/50 px-1.5 py-0.5 rounded-full">Best USA Rank</span>}
            {isWinsAddedRecord  && <span className="text-[9px] font-black uppercase tracking-wide text-emerald-400 border border-emerald-500/50 px-1.5 py-0.5 rounded-full">Most Wins Added</span>}
            {isMostGamesRecord  && <span className="text-[9px] font-black uppercase tracking-wide text-rose-400 border border-rose-500/50 px-1.5 py-0.5 rounded-full">Most Games Played</span>}
          </div>
        )}
      </div>

      <div className="bg-slate-800 px-4 py-3 space-y-2.5">
        {toTitleArr(historyEntry?.title).length > 0 && (
          <p className="text-base font-black text-primary tracking-wide">{toTitleArr(historyEntry.title).join(', ')}</p>
        )}

        {hasRankings && (
          <div className="flex gap-4">
            {historyEntry.class_rank != null && (
              <span className="text-sm font-bold text-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1.5">Class</span>
                #{historyEntry.class_rank}
              </span>
            )}
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

        {hasPlayoffs && <PlayoffRoundsDisplay entry={historyEntry} />}

        {!historyEntry && (
          <p className="text-xs text-slate-600 italic">Tap + Details to add coach, rankings, and playoff info.</p>
        )}
      </div>
    </div>
  );
}

// ── Shared playoff rounds display ─────────────────────────────────────────────

function PlayoffRoundsDisplay({ entry }) {
  const rounds = entry?.playoff_rounds ?? [];
  const hasSeed    = !!entry?.playoff_seed;
  const hasFinish  = !!entry?.state_finish;
  const hasResult  = !!entry?.playoff_result;
  const hasRounds  = rounds.length > 0;

  if (!hasSeed && !hasFinish && !hasResult && !hasRounds) return null;

  return (
    <div className="pt-2 border-t border-slate-700/60 space-y-2">
      {/* Our seed header row */}
      {(hasSeed || hasFinish) && (
        <div className="flex flex-wrap gap-x-5 gap-y-1">
          {hasSeed && (
            <span className="text-xs">
              <span className="text-slate-500 mr-1">Our Seed</span>
              <span className="text-slate-200 font-semibold">{entry.playoff_seed}</span>
            </span>
          )}
          {hasFinish && (
            <span className="text-xs">
              <span className="text-slate-500 mr-1">Finish</span>
              <span className="text-slate-200 font-semibold">{entry.state_finish}</span>
            </span>
          )}
        </div>
      )}

      {/* Structured rounds */}
      {hasRounds && (
        <div className="space-y-1">
          {rounds.map((r, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-slate-400 font-semibold min-w-[7rem]">{r.round || '—'}</span>
              <span className={`font-black px-1.5 py-0.5 rounded text-[10px] ${r.result === 'W' ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'}`}>
                {r.result}
              </span>
              <span className="text-slate-300 flex-1 truncate">
                {r.opponent || '—'}
                {r.opp_seed ? <span className="text-slate-500 ml-1">(#{String(r.opp_seed).replace('#', '')})</span> : null}
              </span>
              {r.score && <span className="text-slate-400 font-mono shrink-0">{r.score}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Legacy free-text result (backward compat) */}
      {hasResult && !hasRounds && (
        <p className="text-xs text-slate-400 italic">{entry.playoff_result}</p>
      )}
    </div>
  );
}

// ── Static Season Card ────────────────────────────────────────────────────────

function SeasonCard({ entry, onEdit, onDelete, isWinRecord, isStateRankRecord, isNationalRankRecord, isWinsAddedRecord, isMostGamesRecord, liveRecord }) {
  const wins       = liveRecord?.wins   ?? entry.wins   ?? null;
  const losses     = liveRecord?.losses ?? entry.losses ?? null;
  const total      = wins != null && losses != null ? wins + losses : null;
  const winPct     = total > 0 ? fmtWinPct(wins, total) : null;
  const hasCoach   = entry.head_coach || entry.asst_coach;
  const hasRecord  = wins != null || losses != null;
  const hasPlayoffs = entry.playoff_seed || entry.state_finish || entry.playoff_result || (entry.playoff_rounds?.length > 0);
  const titleArr   = toTitleArr(entry.title);

  return (
    <div className={`bg-slate-800 rounded-xl overflow-hidden ${
      isWinRecord ? 'border border-amber-500/50' :
      titleArr.length > 0 ? 'border border-primary/40' : 'border border-slate-700/50'
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 ${isWinRecord ? 'bg-amber-900/15' : 'bg-slate-700/40'}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-base font-black text-white">{entry.year}</span>
            {entry.classification && (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">{entry.classification}</span>
            )}
            {hasRecord && (
              <span className="text-sm font-bold text-slate-200 tabular-nums">
                {wins ?? '—'}–{losses ?? '—'}
                {winPct && <span className="text-xs text-slate-400 font-semibold ml-1.5">{winPct}</span>}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button onClick={() => onEdit(entry)} className="text-xs text-primary font-semibold px-2 py-1 rounded-lg hover:bg-slate-600/50 transition-colors">Edit</button>
            <button onClick={() => onDelete(entry)} className="text-xs text-red-400 font-semibold px-2 py-1 rounded-lg hover:bg-slate-600/50 transition-colors">Delete</button>
          </div>
        </div>
        {(isWinRecord || isStateRankRecord || isNationalRankRecord || isWinsAddedRecord || isMostGamesRecord) && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {isWinRecord         && <span className="text-[9px] font-black uppercase tracking-wide text-amber-400 border border-amber-500/50 px-1.5 py-0.5 rounded-full">Most Wins</span>}
            {isStateRankRecord   && <span className="text-[9px] font-black uppercase tracking-wide text-sky-400 border border-sky-500/50 px-1.5 py-0.5 rounded-full">Best State Rank</span>}
            {isNationalRankRecord && <span className="text-[9px] font-black uppercase tracking-wide text-violet-400 border border-violet-500/50 px-1.5 py-0.5 rounded-full">Best USA Rank</span>}
            {isWinsAddedRecord   && <span className="text-[9px] font-black uppercase tracking-wide text-emerald-400 border border-emerald-500/50 px-1.5 py-0.5 rounded-full">Most Wins Added</span>}
            {isMostGamesRecord   && <span className="text-[9px] font-black uppercase tracking-wide text-rose-400 border border-rose-500/50 px-1.5 py-0.5 rounded-full">Most Games Played</span>}
          </div>
        )}
      </div>

      <div className="px-4 py-3 space-y-2.5">
        {titleArr.length > 0 && (
          <p className="text-sm font-black text-primary tracking-wide">{titleArr.join(', ')}</p>
        )}
        {/* Rankings */}
        {(entry.class_rank != null || entry.state_rank != null || entry.national_rank != null) && (
          <div className="flex gap-4">
            {entry.class_rank != null && (
              <span className="text-sm font-bold text-slate-200">
                <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 mr-1.5">Class</span>
                #{entry.class_rank}
              </span>
            )}
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
        {total != null && total > 0 && (
          <p className="text-xs text-slate-500">{total} {total === 1 ? 'game' : 'games'} played</p>
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
        {hasPlayoffs && <PlayoffRoundsDisplay entry={entry} />}
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
  const [liveEditOpen,       setLiveEditOpen]       = useState(false);
  const [confirmEndSeason,   setConfirmEndSeason]   = useState(false);
  const [showPostSeason,     setShowPostSeason]     = useState(false);
  const [commitsOpen,        setCommitsOpen]        = useState(() => getStorageItem(STORAGE_KEYS.HISTORY_COMMITS_OPEN, 'true') !== 'false');
  const [awardsOpen,         setAwardsOpen]         = useState(() => getStorageItem(STORAGE_KEYS.HISTORY_AWARDS_OPEN,  'true') !== 'false');
  const [programHistoryOpen, setProgramHistoryOpen] = useState(() => getStorageItem(STORAGE_KEYS.HISTORY_PROGRAM_OPEN, 'true') !== 'false');
  const [activeAwardId,  setActiveAwardId]  = useState(null);
  const [showAddAward,   setShowAddAward]   = useState(false);
  const [editAward,      setEditAward]      = useState(null);
  const [showAddWinner,  setShowAddWinner]  = useState(false);
  const [editWinner,     setEditWinner]     = useState(null);
  const [confirmDeleteEntry,     setConfirmDeleteEntry]     = useState(null);
  const [confirmDeleteAwardType, setConfirmDeleteAwardType] = useState(null);
  const [confirmDeleteCommit,    setConfirmDeleteCommit]    = useState(null);
  const [confirmDeleteWinner,    setConfirmDeleteWinner]    = useState(null);

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
  const awardTypes = useLiveQuery(
    () => teamId
      ? db.accolade_types.where('team_id').equals(teamId).toArray()
      : Promise.resolve([]),
    [teamId]
  );
  const awardWinners = useLiveQuery(
    () => activeAwardId != null
      ? db.accolade_winners.where('type_id').equals(activeAwardId).toArray()
      : Promise.resolve([]),
    [activeAwardId]
  );
  const tourneyEntries = useLiveQuery(
    () => teamId
      ? db.tourney_entries.where('team_id').equals(teamId).toArray()
      : Promise.resolve([]),
    [teamId]
  );

  // Live match record per season year — always reflects actual completed matches
  const liveRecordsByYear = useLiveQuery(async () => {
    if (!teamId) return {};
    const seasons = await db.seasons.where('team_id').equals(teamId).toArray();
    if (!seasons.length) return {};
    const seasonIds = seasons.map(s => s.id);
    const matches = await db.matches
      .where('season_id').anyOf(seasonIds)
      .filter(m => m.status === MATCH_STATUS.COMPLETE && m.match_type !== 'exhibition')
      .toArray();
    const seasonById = Object.fromEntries(seasons.map(s => [s.id, s]));
    const records = {};
    for (const m of matches) {
      const season = seasonById[m.season_id];
      if (!season?.year) continue;
      const yr = String(season.year);
      if (!records[yr]) records[yr] = { wins: 0, losses: 0 };
      if ((m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)) records[yr].wins++;
      else records[yr].losses++;
    }
    return records;
  }, [teamId]);

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
  useEffect(() => {
    if (orgs?.length === 1 && !orgId) setOrgId(orgs[0].id);
  }, [orgs, orgId]);

  useEffect(() => {
    if (!orgTeams?.length) return;
    const hasF = genderTeams.F.length > 0;
    const hasM = genderTeams.M.length > 0;
    if (hasF && !hasM && gender !== 'F') setGender('F');
    if (hasM && !hasF && gender !== 'M') setGender('M');
  }, [genderTeams, orgTeams?.length]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!gender) { setTeamId(null); return; }
    const matching = genderTeams[gender] ?? [];
    if (matching.length === 1) setTeamId(matching[0].id);
    else if (matching.length === 0) setTeamId(null);
  }, [gender, genderTeams]);


  // Auto-select first award type when the list loads or team changes
  useEffect(() => {
    if (!awardTypes) return;
    const sorted = [...awardTypes].sort((a, b) => a.sort_order - b.sort_order);
    if (sorted.length > 0 && (activeAwardId == null || !sorted.find(t => t.id === activeAwardId))) {
      setActiveAwardId(sorted[0].id);
    } else if (sorted.length === 0) {
      setActiveAwardId(null);
    }
  }, [awardTypes]); // eslint-disable-line react-hooks/exhaustive-deps

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
    // Only suppress the current year from sortedHistory while the season is still active.
    // Once ended, activeSeason is no longer shown as a live card, so the history entry can display.
    const activeYear = (activeSeason?.status !== 'ended' && activeSeason?.year != null)
      ? String(activeSeason.year)
      : null;
    return [...(history ?? [])]
      .filter(h => !activeYear || String(h.year) !== activeYear)
      .sort((a, b) => String(b.year).localeCompare(String(a.year)));
  }, [history, activeSeason]);

  const sortedCommits = useMemo(
    () => [...(commits ?? [])].sort((a, b) => b.grad_year - a.grad_year),
    [commits]
  );

  const sortedAwardTypes = useMemo(
    () => [...(awardTypes ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [awardTypes]
  );

  const sortedAwardWinners = useMemo(
    () => [...(awardWinners ?? [])].sort((a, b) => String(b.year).localeCompare(String(a.year))),
    [awardWinners]
  );

  async function doDeleteEntry(id) {
    await db.season_history.delete(id);
    setConfirmDeleteEntry(null);
  }

  async function doDeleteCommit(id) {
    await db.player_commits.delete(id);
    setConfirmDeleteCommit(null);
  }

  async function doDeleteAwardType(id) {
    await db.transaction('rw', [db.accolade_winners, db.accolade_types], async () => {
      await db.accolade_winners.where('type_id').equals(id).delete();
      await db.accolade_types.delete(id);
    });
    setConfirmDeleteAwardType(null);
  }

  async function doDeleteWinner(id) {
    await db.accolade_winners.delete(id);
    setConfirmDeleteWinner(null);
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
    year:           String(liveHistoryEntry.year ?? activeSeason?.year ?? ''),
    title:          toTitleArr(liveHistoryEntry.title),
    classification: liveHistoryEntry.classification ?? '',
    class_rank:     liveHistoryEntry.class_rank     ?? '',
    state_rank:     liveHistoryEntry.state_rank     != null ? String(liveHistoryEntry.state_rank)    : '',
    national_rank:  liveHistoryEntry.national_rank  != null ? String(liveHistoryEntry.national_rank) : '',
    head_coach:     liveHistoryEntry.head_coach     ?? '',
    tenure_year:    liveHistoryEntry.tenure_year    != null ? String(liveHistoryEntry.tenure_year) : '',
    asst_coach:     liveHistoryEntry.asst_coach     ?? '',
    games:          '',
    wins:           '',
    losses:         '',
    playoff_seed:   liveHistoryEntry.playoff_seed   ?? '',
    state_finish:   liveHistoryEntry.state_finish
                      || inferFinishFromPlayoffRounds(liveHistoryEntry.playoff_rounds)
                      || '',
    playoff_result: liveHistoryEntry.playoff_result ?? '',
    playoff_rounds: liveHistoryEntry.playoff_rounds ?? [],
  } : {
    ...EMPTY_FORM,
    year:         activeSeason?.year != null ? String(activeSeason.year) : '',
    state_finish: activeSeason?.status === 'ended' ? inferFinishFromMatches(activeMatches) : '',
  };

  const showLiveCard = isDefaultTeam && activeSeason != null && activeSeason.status !== 'ended';
  const hasActiveSeason = isDefaultTeam && activeSeason != null;
  const activeSeasonYear = hasActiveSeason ? String(activeSeason.year) : null;

  const liveCardWins = useMemo(() => {
    if (!hasActiveSeason) return 0;
    const completed = (activeMatches ?? []).filter(
      m => m.status === MATCH_STATUS.COMPLETE && m.match_type !== 'exhibition'
    );
    return completed.filter(m => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
  }, [activeMatches, hasActiveSeason]);

  const liveCardGames = useMemo(() => {
    if (!hasActiveSeason) return 0;
    return (activeMatches ?? []).filter(
      m => m.status === MATCH_STATUS.COMPLETE && m.match_type !== 'exhibition'
    ).length;
  }, [activeMatches, hasActiveSeason]);

  const maxWins = useMemo(() => {
    const vals = (history ?? []).map(h => {
      const live = liveRecordsByYear?.[String(h.year)]?.wins;
      return live ?? h.wins;
    }).filter(w => w != null && w > 0);
    if (hasActiveSeason && liveCardWins > 0) vals.push(liveCardWins);
    return vals.length ? Math.max(...vals) : 0;
  }, [history, liveCardWins, hasActiveSeason, liveRecordsByYear]);

  const maxGames = useMemo(() => {
    const vals = (history ?? []).map(h => {
      const live = liveRecordsByYear?.[String(h.year)];
      if (live) return live.wins + live.losses;
      if (h.wins != null && h.losses != null) return h.wins + h.losses;
      return h.games ?? null;
    }).filter(g => g != null && g > 0);
    if (hasActiveSeason && liveCardGames > 0) vals.push(liveCardGames);
    return vals.length ? Math.max(...vals) : 0;
  }, [history, liveCardGames, hasActiveSeason, liveRecordsByYear]);

  const bestStateRank = useMemo(() => {
    const vals = (history ?? []).map(h => h.state_rank).filter(r => r != null && r > 0);
    if (hasActiveSeason && liveHistoryEntry?.state_rank != null) vals.push(liveHistoryEntry.state_rank);
    return vals.length ? Math.min(...vals) : null;
  }, [history, liveHistoryEntry, hasActiveSeason]);

  const bestNationalRank = useMemo(() => {
    const vals = (history ?? []).map(h => h.national_rank).filter(r => r != null && r > 0);
    if (hasActiveSeason && liveHistoryEntry?.national_rank != null) vals.push(liveHistoryEntry.national_rank);
    return vals.length ? Math.min(...vals) : null;
  }, [history, liveHistoryEntry, hasActiveSeason]);

  const bestWinsAdded = useMemo(() => {
    const entries = [...(history ?? [])]
      .filter(h => h.year != null)
      .map(h => {
        const w = liveRecordsByYear?.[String(h.year)]?.wins ?? h.wins;
        return w != null ? { year: h.year, wins: w } : null;
      })
      .filter(Boolean)
      .sort((a, b) => String(a.year).localeCompare(String(b.year)));
    if (hasActiveSeason && activeSeason?.year != null && liveCardWins > 0) {
      entries.push({ year: activeSeason.year, wins: liveCardWins, _live: true });
      entries.sort((a, b) => String(a.year).localeCompare(String(b.year)));
    }
    let maxDelta = 0, bestYear = null, bestIsLive = false;
    for (let i = 1; i < entries.length; i++) {
      const delta = entries[i].wins - entries[i - 1].wins;
      if (delta > maxDelta) {
        maxDelta = delta;
        bestYear = entries[i].year;
        bestIsLive = !!entries[i]._live;
      }
    }
    return maxDelta > 0 ? { year: bestYear, delta: maxDelta, isLive: bestIsLive } : null;
  }, [history, liveCardWins, hasActiveSeason, activeSeason, liveRecordsByYear]);

  const programRecord = useMemo(() => {
    let wins = 0;
    let losses = 0;
    for (const h of sortedHistory) {
      if (activeSeasonYear && String(h.year) === activeSeasonYear) continue;
      wins   += h.wins   ?? 0;
      losses += h.losses ?? 0;
    }
    if (hasActiveSeason) {
      const completed = (activeMatches ?? []).filter(
        m => m.status === MATCH_STATUS.COMPLETE && m.match_type !== 'exhibition'
      );
      wins   += completed.filter(m => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
      losses += completed.filter(m => (m.our_sets_won ?? 0) < (m.opp_sets_won ?? 0)).length;
    }
    const total  = wins + losses;
    const winPct = total > 0 ? fmtWinPct(wins, total) : null;
    return { wins, losses, total, winPct };
  }, [sortedHistory, activeMatches, hasActiveSeason, activeSeasonYear]);

  const [displayProgramRecord, setDisplayProgramRecord] = useState({ wins: 0, losses: 0 });

  useEffect(() => {
    const { wins, losses, total } = programRecord;
    if (total === 0) { setDisplayProgramRecord({ wins: 0, losses: 0 }); return; }
    let step = 0;
    const steps = 30;
    let cancelled = false;
    function tick() {
      if (cancelled) return;
      step++;
      const t = step / steps;
      setDisplayProgramRecord({ wins: Math.round(wins * t), losses: Math.round(losses * t) });
      if (step >= steps) { setDisplayProgramRecord({ wins, losses }); return; }
      const delay = t >= 0.95 ? 260 : t >= 0.75 ? 110 : 36;
      setTimeout(tick, delay);
    }
    setTimeout(tick, 18);
    return () => { cancelled = true; };
  }, [programRecord.wins, programRecord.losses]); // eslint-disable-line react-hooks/exhaustive-deps

  const coachCtx = { hasActiveSeason, activeSeasonYear, activeMatches, liveHistoryEntry, activeSeason };
  const coachRecords     = useMemo(() => computeCoachRecords(sortedHistory, 'head_coach', coachCtx), [sortedHistory, activeMatches, hasActiveSeason, activeSeasonYear, liveHistoryEntry, activeSeason]); // eslint-disable-line react-hooks/exhaustive-deps
  const asstCoachRecords = useMemo(() => computeCoachRecords(sortedHistory, 'asst_coach', coachCtx), [sortedHistory, activeMatches, hasActiveSeason, activeSeasonYear, liveHistoryEntry, activeSeason]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Season search (item 11) ───────────────────────────────────────────────
  const [seasonSearch, setSeasonSearch] = useState('');
  const filteredHistory = useMemo(() => {
    const q = seasonSearch.trim().toLowerCase();
    if (!q) return sortedHistory;
    return sortedHistory.filter(h => String(h.year).toLowerCase().includes(q) || (h.head_coach ?? '').toLowerCase().includes(q));
  }, [sortedHistory, seasonSearch]);

  // ── Sparkline data (item 10) ──────────────────────────────────────────────
  const sparklineData = useMemo(() => {
    const rows = [...sortedHistory].reverse().map(h => {
      const live = liveRecordsByYear?.[String(h.year)];
      const wins = live?.wins ?? h.wins ?? 0;
      return { year: String(h.year), wins };
    });
    if (hasActiveSeason && activeSeason?.year != null && liveCardWins >= 0) {
      const idx = rows.findIndex(r => r.year === String(activeSeason.year));
      const entry = { year: String(activeSeason.year), wins: liveCardWins, isLive: true };
      if (idx !== -1) rows[idx] = entry;
      else rows.push(entry);
    }
    return rows;
  }, [sortedHistory, liveRecordsByYear, hasActiveSeason, activeSeason, liveCardWins]);

  const currentTeam = useMemo(
    () => (orgTeams ?? []).find(t => t.id === teamId) ?? null,
    [orgTeams, teamId]
  );

  const currentOrg = useMemo(
    () => (orgs ?? []).find(o => o.id === orgId) ?? null,
    [orgs, orgId]
  );
  const orgColors = Array.isArray(currentOrg?.colors) ? currentOrg.colors : [];

  const titledSeasons = useMemo(() => {
    const orgType = currentOrg?.type;
    const isCollege = orgType === 'college';
    const isHS      = orgType === 'high_school' || orgType === 'school';
    const stateName = currentOrg?.state ?? currentTeam?.state ?? currentOrg?.state_division ?? '';
    const divLabel  = currentOrg?.division ?? currentOrg?.state_division ?? '';

    const items = [];
    for (const h of (history ?? [])) {
      for (const t of toTitleArr(h.title)) {
        items.push({ year: String(h.year), title: t, priority: titlePriority(t) });
      }
    }
    for (const t of (tourneyEntries ?? [])) {
      const isState = t.name?.toLowerCase().includes('state');
      if (isState) {
        const placingLabel = ordinal(t.placing);
        let label;
        if (isCollege && divLabel) {
          label = `${placingLabel} in ${divLabel}`;
        } else if (isHS && stateName) {
          label = `${placingLabel} State ${stateName}`;
        } else {
          label = `${placingLabel} — ${t.name}`;
        }
        items.push({ year: String(t.year), title: label, priority: 5 });
      } else if (t.placing === 1) {
        items.push({ year: String(t.year), title: `${t.name} Champions`, priority: 0 });
      }
    }
    return items.sort((a, b) => {
      const yCmp = a.year.localeCompare(b.year);
      return yCmp !== 0 ? yCmp : a.priority - b.priority;
    });
  }, [history, tourneyEntries, currentOrg, currentTeam]);
  const teamPrimaryColor   = orgColors[0] ?? currentTeam?.team_jersey_color?.[0] ?? null;
  const teamSecondaryColor = orgColors[1] ?? currentTeam?.team_jersey_color?.[1] ?? null;

  // ── PDF export (item 14) ──────────────────────────────────────────────────
  function exportHistoryPDF() {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const name = orgName || 'Program';
    const genderLabel = currentTeam?.gender === 'F' ? 'Girls' : currentTeam?.gender === 'M' ? 'Boys' : '';

    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(`${name} ${genderLabel} Volleyball — Program History`.trim(), 14, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120);
    const span = sparklineData.length >= 2
      ? `${sparklineData[0].year} – ${sparklineData[sparklineData.length - 1].year}`
      : sparklineData[0]?.year ?? '';
    const seasonCount = (sortedHistory.length + (showLiveCard ? 1 : 0));
    if (programRecord.total > 0) {
      doc.text(`${programRecord.wins}–${programRecord.losses} all-time (${programRecord.winPct}) · ${seasonCount} seasons${span ? ` · ${span}` : ''}`, 14, 26);
    }
    doc.setTextColor(0);

    // Season log table
    const seasonRows = (showLiveCard ? [{ year: activeSeason.year, wins: liveCardWins, losses: liveCardGames - liveCardWins, head_coach: liveHistoryEntry?.head_coach ?? activeSeason?.head_coach ?? '', title: liveHistoryEntry?.title ?? null, state_rank: liveHistoryEntry?.state_rank ?? null, playoff_rounds: liveHistoryEntry?.playoff_rounds ?? [], state_finish: liveHistoryEntry?.state_finish ?? '' }, ...sortedHistory] : sortedHistory)
      .map(h => {
        const live = liveRecordsByYear?.[String(h.year)];
        const w = live?.wins ?? h.wins ?? '';
        const l = live?.losses ?? h.losses ?? '';
        const titles = toTitleArr(h.title).join(', ');
        const finish = h.state_finish || (h.playoff_rounds?.length ? h.playoff_rounds[h.playoff_rounds.length - 1].round : '');
        return [String(h.year), w !== '' && l !== '' ? `${w}–${l}` : '—', h.head_coach ?? '', titles, finish, h.state_rank != null ? `#${h.state_rank}` : ''];
      });

    autoTable(doc, {
      startY: 32,
      head: [['Year', 'Record', 'Head Coach', 'Titles', 'Playoff Finish', 'State Rank']],
      body: seasonRows,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      columnStyles: { 0: { cellWidth: 18 }, 1: { cellWidth: 16 }, 5: { cellWidth: 18 } },
    });

    // Coach records
    if (coachRecords.length > 0) {
      const y = doc.lastAutoTable.finalY + 8;
      doc.setFontSize(11); doc.setFont('helvetica', 'bold');
      doc.text('Head Coach Records', 14, y);
      autoTable(doc, {
        startY: y + 4,
        head: [['Coach', 'Record', 'Win%', 'Years']],
        body: coachRecords.map(c => [c.name, `${c.wins}–${c.losses}`, c.winPct ?? '—', c.yearLabel ?? '']),
        styles: { fontSize: 8, cellPadding: 2 },
        headStyles: { fillColor: [249, 115, 22], textColor: 255, fontStyle: 'bold' },
      });
    }

    doc.save(`${name.replace(/\s+/g, '_')}_History.pdf`);
  }

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
          <select value={orgId ?? ''} onChange={e => { setOrgId(Number(e.target.value)); setGender(null); setTeamId(null); }} className={selectCls}>
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
                {/* Championship Banners */}
                <ChampionshipBannersSection
                  titledSeasons={titledSeasons}
                  orgName={orgName}
                  primaryColorId={teamPrimaryColor}
                  secondaryColorId={teamSecondaryColor}
                />

                {/* College Commits */}
                <div>
                  <button
                    onClick={() => setCommitsOpen(o => { const next = !o; localStorage.setItem(STORAGE_KEYS.HISTORY_COMMITS_OPEN, String(next)); return next; })}
                    className="w-full flex items-center justify-between bg-black rounded-xl px-4 py-3 border border-slate-800 hover:border-slate-700 transition-colors"
                    style={{ marginBottom: commitsOpen ? '0.75rem' : '0' }}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">College Commits</h3>
                        {sortedCommits.length > 0 && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400">{sortedCommits.length}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">Player commitments &amp; signings</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        onClick={e => { e.stopPropagation(); setShowAddCommit(true); }}
                        className="text-xs font-bold px-2.5 py-1.5 rounded-lg text-black bg-[#f97316] hover:brightness-110 transition-all"
                      >
                        + Add
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-500 transition-transform duration-200 ${commitsOpen ? 'rotate-90' : 'rotate-0'}`}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </button>
                  {commitsOpen && commits !== undefined && (
                    sortedCommits.length === 0 ? (
                      <button
                        onClick={() => setShowAddCommit(true)}
                        className="w-full py-4 rounded-xl border border-dashed border-slate-700 text-sm text-slate-500 hover:text-slate-300 hover:border-slate-500 transition-colors"
                      >
                        + Add First Commit
                      </button>
                    ) : (
                      <div className="space-y-2">
                        {sortedCommits.map(c => (
                          <CommitCard key={c.id} entry={c} onEdit={setEditCommit} onDelete={setConfirmDeleteCommit} />
                        ))}
                      </div>
                    )
                  )}
                </div>

                {/* Individual Awards */}
                <div>
                  <button
                    onClick={() => setAwardsOpen(o => { const next = !o; localStorage.setItem(STORAGE_KEYS.HISTORY_AWARDS_OPEN, String(next)); return next; })}
                    className="w-full flex items-center justify-between bg-black rounded-xl px-4 py-3 border border-slate-800 hover:border-slate-700 transition-colors"
                    style={{ marginBottom: awardsOpen ? '0.75rem' : '0' }}
                  >
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-white">Individual Awards</h3>
                        {sortedAwardTypes.length > 0 && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400">{sortedAwardTypes.length}</span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">All-conference, all-state &amp; team honors</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div
                        onClick={e => { e.stopPropagation(); setShowAddAward(true); }}
                        className="text-xs font-bold px-2.5 py-1.5 rounded-lg text-black bg-[#f97316] hover:brightness-110 transition-all"
                      >
                        + Award
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-500 transition-transform duration-200 ${awardsOpen ? 'rotate-90' : 'rotate-0'}`}>
                        <path d="M9 18l6-6-6-6" />
                      </svg>
                    </div>
                  </button>

                  {awardsOpen && awardTypes !== undefined && (
                    sortedAwardTypes.length === 0 ? (
                      <p className="text-xs text-slate-500 italic">No awards created yet.</p>
                    ) : (
                      <>
                        {/* Award type pill row — overflow scroll so edit/delete don't clip */}
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                          {sortedAwardTypes.map(type => {
                            const isActive = activeAwardId === type.id;
                            return (
                              <div key={type.id} className="flex items-center shrink-0">
                                <button
                                  onClick={() => setActiveAwardId(type.id)}
                                  className={`px-3 py-1.5 text-xs font-bold transition-colors ${
                                    isActive
                                      ? 'bg-primary text-white rounded-l-full'
                                      : 'bg-slate-700 text-slate-400 hover:text-slate-200 rounded-full'
                                  }`}
                                >
                                  {type.name}
                                </button>
                                {isActive && (
                                  <>
                                    <button onClick={() => setEditAward(type)} className="px-2 py-1.5 bg-primary/80 text-white text-xs font-bold hover:bg-primary transition-colors" title="Rename">✎</button>
                                    <button onClick={() => setConfirmDeleteAwardType(type)} className="px-2 py-1.5 bg-red-700/80 text-white text-xs font-bold rounded-r-full hover:bg-red-600 transition-colors" title="Delete award">×</button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Winner list for active award */}
                        {activeAwardId != null && (
                          <div className="mt-2 space-y-2">
                            <button onClick={() => setShowAddWinner(true)} className="w-full py-1.5 rounded-lg border border-dashed border-slate-600 text-xs text-slate-400 hover:text-white hover:border-slate-400 transition-colors">
                              + Winner
                            </button>
                            {awardWinners === undefined ? null : sortedAwardWinners.length === 0 ? (
                              <p className="text-xs text-slate-500 italic">No winners recorded yet.</p>
                            ) : (() => {
                              const groups = [];
                              for (const w of sortedAwardWinners) {
                                const last = groups[groups.length - 1];
                                if (!last || last.year !== w.year) groups.push({ year: w.year, winners: [w] });
                                else last.winners.push(w);
                              }
                              return groups.map((g, gi) => (
                                <div key={g.year ?? gi}>
                                  {gi > 0 && <div className="border-t border-slate-700/60 my-1" />}
                                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">{g.year}</p>
                                  <div className="space-y-2">
                                    {g.winners.map(w => (
                                      <WinnerCard key={w.id} entry={w} onEdit={setEditWinner} onDelete={setConfirmDeleteWinner} />
                                    ))}
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        )}
                      </>
                    )
                  )}
                </div>

                {/* Program History header */}
                <button
                  onClick={() => setProgramHistoryOpen(o => { const next = !o; localStorage.setItem(STORAGE_KEYS.HISTORY_PROGRAM_OPEN, String(next)); return next; })}
                  className="w-full flex items-center justify-between bg-black rounded-xl px-4 py-3 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-white">Program History</h3>
                      {(sortedHistory.length + (showLiveCard ? 1 : 0)) > 0 && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full bg-slate-700 text-slate-400">
                          {sortedHistory.length + (showLiveCard ? 1 : 0)} seasons
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">All-time record, coaching staff &amp; season log</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`text-slate-500 transition-transform duration-200 shrink-0 ${programHistoryOpen ? 'rotate-90' : 'rotate-0'}`}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </button>

                {programHistoryOpen && (
                  <>
                    {/* Program Overall Record + sparkline */}
                    {programRecord.total > 0 && (
                      <div className="bg-surface rounded-xl px-4 py-3">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Program Overall Record</p>
                          <button
                            onClick={exportHistoryPDF}
                            className="text-[10px] font-bold text-primary border border-primary/30 px-2 py-0.5 rounded-full hover:bg-primary/10 transition-colors"
                          >
                            Export PDF
                          </button>
                        </div>
                        <div className="grid grid-cols-3 divide-x divide-slate-700/60">
                          <div className="text-center pr-3">
                            <div className="text-4xl font-black text-emerald-400 tabular-nums leading-none">{displayProgramRecord.wins}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 mt-1">Wins</div>
                          </div>
                          <div className="text-center px-3">
                            <div className="text-4xl font-black text-red-400 tabular-nums leading-none">{displayProgramRecord.losses}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-red-800 mt-1">Losses</div>
                          </div>
                          <div className="text-center pl-3">
                            <div className="text-4xl font-black text-primary tabular-nums leading-none">{programRecord.winPct ?? '—'}</div>
                            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">Win%</div>
                          </div>
                        </div>
                        {/* Across X seasons span (item 13) */}
                        {sparklineData.length >= 2 && (
                          <p className="text-[10px] text-slate-600 text-center mt-2">
                            Across {sparklineData.length} seasons ({sparklineData[0].year}–{sparklineData[sparklineData.length - 1].year})
                          </p>
                        )}
                        {/* Win trend sparkline (item 10) */}
                        {sparklineData.length >= 2 && (
                          <div className="mt-4">
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Wins Per Season</p>
                            <ResponsiveContainer width="100%" height={72}>
                              <BarChart data={sparklineData} barCategoryGap="20%">
                                <XAxis dataKey="year" tick={{ fontSize: 8, fill: '#64748b' }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                                <Tooltip
                                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8, fontSize: 11 }}
                                  formatter={(v) => [v, 'Wins']}
                                />
                                <Bar dataKey="wins" radius={[3, 3, 0, 0]}>
                                  {sparklineData.map((entry, i) => (
                                    <Cell key={i} fill={entry.isLive ? '#f97316' : '#f9731666'} />
                                  ))}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Head Coach + Asst Coach Records */}
                    {(coachRecords.length > 0 || asstCoachRecords.length > 0) && (
                      <div className="bg-surface rounded-xl px-4 py-3 space-y-3">
                        {coachRecords.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Head Coach Records</p>
                            <div className="space-y-2">
                              {coachRecords.map(({ name, wins, losses, winPct, yearLabel }) => (
                                <div key={name} className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-slate-200 truncate">
                                    {name}
                                    {yearLabel && <span className="text-xs font-normal text-slate-500 ml-1.5">({yearLabel})</span>}
                                  </span>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-sm font-black tabular-nums">
                                      <span className="text-emerald-400">{wins}</span>
                                      <span className="text-slate-600 mx-0.5">–</span>
                                      <span className="text-red-400">{losses}</span>
                                    </span>
                                    {winPct && <span className="text-xs font-bold text-primary tabular-nums w-14 text-right">{winPct}</span>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {coachRecords.length > 0 && asstCoachRecords.length > 0 && <div className="border-t border-slate-700/60" />}
                        {asstCoachRecords.length > 0 && (
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Assistant Coach Records</p>
                            <div className="space-y-2">
                              {asstCoachRecords.map(({ name, wins, losses, winPct, yearLabel }) => (
                                <div key={name} className="flex items-center justify-between gap-2">
                                  <span className="text-sm font-semibold text-slate-200 truncate">
                                    {name}
                                    {yearLabel && <span className="text-xs font-normal text-slate-500 ml-1.5">({yearLabel})</span>}
                                  </span>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <span className="text-sm font-black tabular-nums">
                                      <span className="text-emerald-400">{wins}</span>
                                      <span className="text-slate-600 mx-0.5">–</span>
                                      <span className="text-red-400">{losses}</span>
                                    </span>
                                    {winPct && <span className="text-xs font-bold text-primary tabular-nums w-14 text-right">{winPct}</span>}
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
                      {/* Season search (item 11) — only show when there are enough seasons */}
                      {(sortedHistory.length + (showLiveCard ? 1 : 0)) >= 5 && (
                        <input
                          type="search"
                          value={seasonSearch}
                          onChange={e => setSeasonSearch(e.target.value)}
                          placeholder="Search by year or coach…"
                          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-primary"
                        />
                      )}

                      {showLiveCard && (
                        <LiveSeasonCard
                          year={activeSeason.year}
                          matches={activeMatches}
                          historyEntry={liveHistoryEntry}
                          activeSeason={activeSeason}
                          onEdit={() => setLiveEditOpen(true)}
                          onEndSeason={() => setConfirmEndSeason(true)}
                          isWinRecord={maxWins > 0 && liveCardWins === maxWins}
                          isStateRankRecord={bestStateRank != null && liveHistoryEntry?.state_rank === bestStateRank}
                          isNationalRankRecord={bestNationalRank != null && liveHistoryEntry?.national_rank === bestNationalRank}
                          isWinsAddedRecord={bestWinsAdded?.isLive === true}
                          isMostGamesRecord={maxGames > 0 && liveCardGames === maxGames}
                        />
                      )}

                      {history === undefined ? null : sortedHistory.length === 0 && !showLiveCard ? (
                        <EmptyState
                          icon="📖"
                          title="No seasons recorded"
                          description="Tap + Season to start building your program's history"
                        />
                      ) : filteredHistory.length === 0 && seasonSearch ? (
                        <p className="text-sm text-slate-500 text-center py-4">No seasons match "{seasonSearch}"</p>
                      ) : sortedHistory.length === 0 && showLiveCard ? null : (
                        filteredHistory.map(entry => (
                          <SeasonCard
                            key={entry.id}
                            entry={entry}
                            onEdit={setEditEntry}
                            onDelete={setConfirmDeleteEntry}
                            isWinRecord={maxWins > 0 && (liveRecordsByYear?.[String(entry.year)]?.wins ?? entry.wins) === maxWins}
                            isStateRankRecord={bestStateRank != null && entry.state_rank === bestStateRank}
                            isNationalRankRecord={bestNationalRank != null && entry.national_rank === bestNationalRank}
                            isWinsAddedRecord={bestWinsAdded != null && !bestWinsAdded.isLive && String(entry.year) === String(bestWinsAdded.year)}
                            isMostGamesRecord={(() => {
                              const live = liveRecordsByYear?.[String(entry.year)];
                              const g = live ? live.wins + live.losses
                                : entry.wins != null && entry.losses != null ? entry.wins + entry.losses
                                : entry.games ?? null;
                              return maxGames > 0 && g === maxGames;
                            })()}
                            liveRecord={liveRecordsByYear?.[String(entry.year)] ?? null}
                          />
                        ))
                      )}
                    </div>
                  </>
                )}
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
            title:          toTitleArr(editEntry.title),
            classification: editEntry.classification ?? '',
            class_rank:     editEntry.class_rank     ?? '',
            state_rank:     editEntry.state_rank     != null ? String(editEntry.state_rank)    : '',
            national_rank:  editEntry.national_rank  != null ? String(editEntry.national_rank) : '',
            head_coach:     editEntry.head_coach     ?? '',
            tenure_year:    editEntry.tenure_year    != null ? String(editEntry.tenure_year) : '',
            asst_coach:     editEntry.asst_coach     ?? '',
            games:          editEntry.games          != null ? String(editEntry.games)   : '',
            wins:           editEntry.wins           != null ? String(editEntry.wins)    : '',
            losses:         editEntry.losses         != null ? String(editEntry.losses)  : '',
            playoff_seed:   editEntry.playoff_seed   ?? '',
            state_finish:   editEntry.state_finish
                              || inferFinishFromPlayoffRounds(editEntry.playoff_rounds)
                              || '',
            playoff_result: editEntry.playoff_result ?? '',
            playoff_rounds: editEntry.playoff_rounds ?? [],
          }}
          onClose={() => setEditEntry(null)}
        />
      )}

      {showAddAward && teamId && (
        <AwardTypeModal teamId={teamId} onClose={() => setShowAddAward(false)} />
      )}

      {editAward && teamId && (
        <AwardTypeModal
          teamId={teamId}
          editId={editAward.id}
          initialData={{ name: editAward.name ?? '' }}
          onClose={() => setEditAward(null)}
        />
      )}

      {showAddWinner && teamId && activeAwardId != null && (
        <AwardWinnerModal
          teamId={teamId}
          typeId={activeAwardId}
          onClose={() => setShowAddWinner(false)}
        />
      )}

      {editWinner && teamId && (
        <AwardWinnerModal
          teamId={teamId}
          typeId={editWinner.type_id}
          editId={editWinner.id}
          initialData={{
            player_name: editWinner.player_name ?? '',
            year:        editWinner.year        ?? '',
            school_year: editWinner.school_year ?? '',
            times_won:   editWinner.times_won   != null ? String(editWinner.times_won) : '1',
          }}
          onClose={() => setEditWinner(null)}
        />
      )}

      {confirmEndSeason && activeSeason && (
        <ConfirmDialog
          title="End Season?"
          message="Mark this season as complete. Any unplayed scheduled matches will stay on the schedule but the season will show as Done."
          confirmLabel="End Season"
          danger
          onConfirm={async () => {
            await db.seasons.update(activeSeason.id, { status: 'ended' });
            await applyInferredSeasonFinish(activeSeason.id, activeSeason.team_id, activeSeason.year);
            setConfirmEndSeason(false);
            setShowPostSeason(true);
          }}
          onCancel={() => setConfirmEndSeason(false)}
        />
      )}

      {showPostSeason && activeSeason && (
        <PostSeasonModal
          teamId={activeSeason.team_id}
          year={activeSeason.year}
          onClose={() => setShowPostSeason(false)}
        />
      )}

      {confirmDeleteEntry && (
        <ConfirmDialog
          title="Delete Season"
          message={`Delete the ${confirmDeleteEntry.year} season record? All rankings, playoff results, and coach info for that year will be permanently lost.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => doDeleteEntry(confirmDeleteEntry.id)}
          onCancel={() => setConfirmDeleteEntry(null)}
        />
      )}

      {confirmDeleteCommit && (
        <ConfirmDialog
          title="Delete Commit"
          message={`Delete ${confirmDeleteCommit.player_name}'s commit to ${confirmDeleteCommit.college}? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => doDeleteCommit(confirmDeleteCommit.id)}
          onCancel={() => setConfirmDeleteCommit(null)}
        />
      )}

      {confirmDeleteAwardType && (
        <ConfirmDialog
          title="Delete Award"
          message={`Delete "${confirmDeleteAwardType.name}" and all its recorded winners? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => doDeleteAwardType(confirmDeleteAwardType.id)}
          onCancel={() => setConfirmDeleteAwardType(null)}
        />
      )}

      {confirmDeleteWinner && (
        <ConfirmDialog
          title="Delete Winner"
          message={`Delete ${confirmDeleteWinner.player_name}'s entry? This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={() => doDeleteWinner(confirmDeleteWinner.id)}
          onCancel={() => setConfirmDeleteWinner(null)}
        />
      )}

      {/* Live card edit modal — creates or updates the matching season_history entry */}
      {liveEditOpen && teamId && activeSeason && (
        <HistoryModal
          teamId={teamId}
          editId={liveHistoryEntry?.id}
          initialData={liveEditInitial}
          liveMode
          onClose={() => setLiveEditOpen(false)}
        />
      )}
    </div>
  );
}
