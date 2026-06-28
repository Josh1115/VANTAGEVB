import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { MATCH_STATUS } from '../constants';
import { getIntStorage, setStorageItem, STORAGE_KEYS } from '../utils/storage';
import { PageHeader } from '../components/layout/PageHeader';
import { TabBar } from '../components/ui/Tab';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';

const selectClass = 'bg-surface border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary';

// ── Tendency types ───────────────────────────────────────────────────────────
const TENDENCY_TYPES = [
  { type: 'serve_target',    label: 'Serve Target',     icon: '🎯', placeholder: 'ex: Short zones 1 & 6' },
  { type: 'attack_pattern',  label: 'Attack Pattern',   icon: '📐', placeholder: 'ex: Heavy outside, quick middle' },
  { type: 'defense_style',   label: 'Defense Style',    icon: '🛡️', placeholder: 'ex: Rotational, perimeter' },
  { type: 'rotation_strength', label: 'Strong Rotation', icon: '💪', placeholder: 'ex: Rotation 2 — ace server' },
  { type: 'rotation_weakness', label: 'Weak Rotation',  icon: '⚠️', placeholder: 'ex: Rotation 5 — weak passer' },
  { type: 'key_player',      label: 'Key Player',       icon: '⭐', placeholder: 'ex: #12 — jump float to zone 1' },
  { type: 'note',            label: 'Other Note',       icon: '📝', placeholder: 'General observation…' },
];

// ── History tab ──────────────────────────────────────────────────────────────
function HistoryTab({ oppId, oppName, selectedTeamId, selectedSeasonId }) {
  const navigate = useNavigate();

  const matches = useLiveQuery(async () => {
    const nameLower = (oppName ?? '').toLowerCase();
    const all = await db.matches.toArray();
    let filtered = all.filter(m =>
      m.opponent_id === oppId || (m.opponent_name ?? '').toLowerCase() === nameLower
    );
    if (selectedTeamId) {
      const seasons = await db.seasons.where('team_id').equals(selectedTeamId).toArray();
      const sIds = new Set(seasons.map(s => s.id));
      filtered = filtered.filter(m => sIds.has(m.season_id));
    }
    if (selectedSeasonId) {
      filtered = filtered.filter(m => m.season_id === selectedSeasonId);
    }
    return filtered.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  }, [oppId, oppName, selectedTeamId, selectedSeasonId]);

  if (!matches) return <div className="flex justify-center p-8"><Spinner /></div>;

  if (matches.length === 0) {
    return (
      <EmptyState
        icon="📅"
        title="No matches recorded"
        description="Matches against this opponent will appear here automatically after setup."
      />
    );
  }

  const complete = matches.filter(m => m.status === MATCH_STATUS.COMPLETE);
  const wins   = complete.filter(m => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
  const losses = complete.filter(m => (m.opp_sets_won ?? 0) > (m.our_sets_won ?? 0)).length;

  return (
    <div className="p-4 space-y-3">
      {complete.length > 0 && (
        <div className="text-center py-2">
          <span className="text-2xl font-bold text-white">{wins}–{losses}</span>
          <span className="text-sm text-slate-400 ml-2">{selectedSeasonId ? 'this season' : 'all-time'}</span>
        </div>
      )}
      {matches.map(m => {
        const dateStr = m.date
          ? new Date(m.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
          : 'Date unknown';
        const isComplete = m.status === MATCH_STATUS.COMPLETE;
        const won = isComplete && (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0);
        const lost = isComplete && (m.opp_sets_won ?? 0) > (m.our_sets_won ?? 0);
        const resultColor = won ? 'text-emerald-400' : lost ? 'text-red-400' : 'text-slate-400';
        const resultLabel = won ? 'W' : lost ? 'L' : isComplete ? '?' : '…';
        const setScore = isComplete ? `${m.our_sets_won ?? 0}–${m.opp_sets_won ?? 0}` : null;
        return (
          <button
            key={m.id}
            onClick={() => navigate(`/matches/${m.id}/summary`)}
            className="w-full bg-surface rounded-xl px-4 py-3 flex items-center gap-3 text-left hover:bg-slate-700 active:scale-[0.98] transition-[transform,background-color] duration-75"
          >
            <span className={`text-lg font-bold w-6 shrink-0 ${resultColor}`}>{resultLabel}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-white font-semibold">{dateStr}</div>
              {setScore && <div className="text-xs text-slate-400">Sets {setScore}</div>}
              {m.location && <div className="text-xs text-slate-500">{m.location}</div>}
            </div>
            <span className="text-slate-600">›</span>
          </button>
        );
      })}
    </div>
  );
}

// ── Tendencies tab ───────────────────────────────────────────────────────────
function TendenciesTab({ oppId, selectedTeamId, selectedSeasonId }) {
  const [addType, setAddType]     = useState(null);
  const [addValue, setAddValue]   = useState('');
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState(null);

  const tendencies = useLiveQuery(async () => {
    const all = await db.opp_tendencies.where('opp_id').equals(oppId).toArray();
    if (!selectedTeamId) return all;

    const seasons = await db.seasons.where('team_id').equals(selectedTeamId).toArray();
    const sIds = new Set(
      selectedSeasonId
        ? [selectedSeasonId]
        : seasons.map(s => s.id)
    );
    const matches = await db.matches.filter(m => sIds.has(m.season_id)).toArray();
    const mIds = new Set(matches.map(m => m.id));

    return all.filter(t =>
      (!t.match_id && (!t.team_id || t.team_id === selectedTeamId)) ||
      (t.match_id && mIds.has(t.match_id))
    );
  }, [oppId, selectedTeamId, selectedSeasonId]);

  async function handleAdd() {
    const value = addValue.trim();
    if (!value || !addType) return;
    setSaving(true);
    try {
      await db.opp_tendencies.add({
        opp_id: oppId,
        team_id: selectedTeamId ?? null,
        match_id: null,
        type: addType,
        value,
        created_at: new Date().toISOString(),
      });
      setAddValue('');
      setAddType(null);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    setDeleting(id);
    try { await db.opp_tendencies.delete(id); } finally { setDeleting(null); }
  }

  const grouped = useMemo(() => {
    const g = {};
    for (const t of tendencies ?? []) {
      (g[t.type] ??= []).push(t);
    }
    return g;
  }, [tendencies]);

  const placeholder = TENDENCY_TYPES.find(t => t.type === addType)?.placeholder ?? 'Add detail…';

  return (
    <div className="p-4 space-y-4">
      {/* Add tendency */}
      <div className="bg-surface rounded-xl p-3 space-y-2">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Add Tendency</p>
        <div className="grid grid-cols-2 gap-1.5">
          {TENDENCY_TYPES.map(t => (
            <button
              key={t.type}
              onClick={() => setAddType(prev => prev === t.type ? null : t.type)}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${addType === t.type ? 'bg-primary/20 text-primary border border-primary/40' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>
        {addType && (
          <div className="flex gap-2">
            <input
              autoFocus
              className="flex-1 px-3 py-2 rounded-lg bg-bg border border-slate-600 text-white text-sm placeholder:text-slate-500"
              placeholder={placeholder}
              value={addValue}
              onChange={e => setAddValue(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            />
            <Button size="sm" onClick={handleAdd} disabled={saving || !addValue.trim()}>Add</Button>
          </div>
        )}
      </div>

      {/* Existing tendencies grouped by type */}
      {!tendencies ? (
        <div className="flex justify-center p-4"><Spinner /></div>
      ) : (tendencies.length === 0 && !addType) ? (
        <EmptyState icon="🔭" title="No tendencies yet" description="Tap a category above to add your first scouting note." />
      ) : (
        TENDENCY_TYPES
          .filter(t => grouped[t.type]?.length)
          .map(t => (
            <div key={t.type}>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide mb-1.5 flex items-center gap-1">
                <span>{t.icon}</span> {t.label}
              </p>
              <div className="space-y-1.5">
                {grouped[t.type].map(item => (
                  <div key={item.id} className="bg-surface rounded-lg px-3 py-2 flex items-start gap-2">
                    <p className="flex-1 text-sm text-slate-200">{item.value}</p>
                    <button
                      onClick={() => handleDelete(item.id)}
                      disabled={deleting === item.id}
                      className="text-slate-600 hover:text-red-400 transition-colors text-lg leading-none shrink-0 mt-0.5"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))
      )}
    </div>
  );
}

// ── Notes tab ────────────────────────────────────────────────────────────────
function NotesTab({ opp }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(opp?.notes ?? '');
  const [saving, setSaving]   = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await db.opponents.update(opp.id, { notes: draft });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="p-4">
      {editing ? (
        <div className="space-y-2">
          <textarea
            autoFocus
            rows={10}
            className="w-full px-3 py-2 rounded-xl bg-surface border border-slate-600 text-white text-sm placeholder:text-slate-500 resize-none"
            placeholder="Pre/post-game notes, tendencies, staff observations…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving}>Save</Button>
            <Button variant="ghost" onClick={() => { setEditing(false); setDraft(opp?.notes ?? ''); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <div>
          {opp?.notes ? (
            <div
              className="bg-surface rounded-xl px-4 py-3 text-sm text-slate-200 whitespace-pre-wrap cursor-pointer hover:bg-slate-700 transition-colors"
              onClick={() => setEditing(true)}
            >
              {opp.notes}
            </div>
          ) : (
            <EmptyState
              icon="📝"
              title="No notes yet"
              description="Add pre-game prep, post-game observations, or coaching notes."
              action={<Button onClick={() => setEditing(true)}>Add Notes</Button>}
            />
          )}
          {opp?.notes && (
            <button
              onClick={() => setEditing(true)}
              className="mt-2 text-sm text-slate-400 hover:text-white transition-colors"
            >
              Edit notes
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Delete confirmation modal ────────────────────────────────────────────────
function DeleteOppModal({ opp, matchCount, onConfirm, onCancel, deleting }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <p className="text-white font-bold text-base">Delete {opp.name}?</p>
          <p className="text-slate-400 text-sm leading-relaxed">
            This will permanently delete this opponent and all scouting tendencies saved for them.
            {matchCount > 0 && (
              <> The <span className="text-white font-semibold">{matchCount} match{matchCount !== 1 ? 'es' : ''}</span> recorded against them will be kept — this opponent will just appear as a name with no linked profile.</>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-slate-700 text-slate-200 text-sm font-semibold hover:bg-slate-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export function OpponentDetailPage() {
  const { oppId } = useParams();
  const navigate  = useNavigate();
  const oid = Number(oppId);
  const [tab, setTab] = useState('history');
  const [selectedTeamId, setSelectedTeamId] = useState(() => getIntStorage(STORAGE_KEYS.DEFAULT_TEAM_ID, null));
  const [selectedSeasonId, setSelectedSeasonId] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting,   setDeleting]   = useState(false);

  const opp   = useLiveQuery(() => db.opponents.get(oid), [oid]);
  const teams  = useLiveQuery(() => db.teams.toArray(), []);
  const seasons = useLiveQuery(async () => {
    if (!selectedTeamId) return [];
    return db.seasons.where('team_id').equals(selectedTeamId).sortBy('year').then(s => [...s].reverse());
  }, [selectedTeamId]);

  const matchCount = useLiveQuery(async () => {
    const nameLower = (opp?.name ?? '').toLowerCase();
    const all = await db.matches.toArray();
    return all.filter(m =>
      m.opponent_id === oid || (m.opponent_name ?? '').toLowerCase() === nameLower
    ).length;
  }, [oid, opp?.name]);

  function handleTeamChange(e) {
    const id = e.target.value ? Number(e.target.value) : null;
    setSelectedTeamId(id);
    setSelectedSeasonId(null);
    setStorageItem(STORAGE_KEYS.DEFAULT_TEAM_ID, id);
  }

  function handleSeasonChange(e) {
    setSelectedSeasonId(e.target.value ? Number(e.target.value) : null);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await db.opp_tendencies.where('opp_id').equals(oid).delete();
      await db.matches.where('opponent_id').equals(oid).modify({ opponent_id: null });
      await db.opponents.delete(oid);
      navigate('/opponents', { replace: true });
    } finally {
      setDeleting(false);
    }
  }

  if (!opp) {
    return <div className="flex items-center justify-center h-48"><Spinner /></div>;
  }

  return (
    <div>
      <PageHeader
        title={opp.name}
        backTo="/opponents"
        action={
          <button
            onClick={() => setDeleteOpen(true)}
            className="p-2 text-slate-500 hover:text-red-400 transition-colors rounded-lg"
            title="Delete opponent"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        }
      />

      {/* Filters row */}
      {(teams ?? []).length > 0 && (
        <div className="px-4 pt-3 pb-1 flex gap-2">
          <select className={selectClass} value={selectedTeamId ?? ''} onChange={handleTeamChange}>
            <option value="">All Teams</option>
            {(teams ?? []).map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
          {selectedTeamId && (seasons ?? []).length > 0 && (
            <select className={selectClass} value={selectedSeasonId ?? ''} onChange={handleSeasonChange}>
              <option value="">All Seasons</option>
              {(seasons ?? []).map(s => (
                <option key={s.id} value={s.id}>{s.name ?? String(s.year)}</option>
              ))}
            </select>
          )}
        </div>
      )}

      <TabBar
        tabs={[
          { value: 'history',    label: 'History'    },
          { value: 'tendencies', label: 'Tendencies' },
          { value: 'notes',      label: 'Notes'      },
        ]}
        active={tab}
        onChange={setTab}
      />

      {tab === 'history'    && <HistoryTab    oppId={oid} oppName={opp.name} selectedTeamId={selectedTeamId} selectedSeasonId={selectedSeasonId} />}
      {tab === 'tendencies' && <TendenciesTab oppId={oid} selectedTeamId={selectedTeamId} selectedSeasonId={selectedSeasonId} />}
      {tab === 'notes'      && <NotesTab      opp={opp}   />}

      {deleteOpen && (
        <DeleteOppModal
          opp={opp}
          matchCount={matchCount ?? 0}
          onConfirm={handleDelete}
          onCancel={() => setDeleteOpen(false)}
          deleting={deleting}
        />
      )}
    </div>
  );
}
