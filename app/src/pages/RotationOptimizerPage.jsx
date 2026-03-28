import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/schema';
import { computePlayerStats, computeRotationStats } from '../stats/engine';
import { getContactsForMatches, getRalliesForMatches, getPlayerPositionsForMatches } from '../stats/queries';
import { PageHeader } from '../components/layout/PageHeader';
import { Spinner } from '../components/ui/Spinner';

// Maps visual grid cell (0-5) → serve-order index (0-based, where 0 = S1 = server)
// Front row top: S4|S3|S2 → indices 3,2,1
// Back row bottom: S5|S6|S1★ → indices 4,5,0
const GRID_ORDER = [3, 2, 1, 4, 5, 0];
const CELL_LABELS = ['S4', 'S3', 'S2', 'S5', 'S6', 'S1'];

// For rotation N (1–6), the player shown in grid cell g is at serve-order slot:
// slots[(GRID_ORDER[g] + N - 1) % 6]
function slotIdxForCell(gridCell, rotation) {
  return (GRID_ORDER[gridCell] + rotation - 1) % 6;
}

function rotBg(pct) {
  if (pct == null) return 'bg-slate-800 text-slate-400';
  if (pct >= 0.50)  return 'bg-emerald-950 text-emerald-300';
  if (pct >= 0.42)  return 'bg-yellow-950  text-yellow-300';
  return                    'bg-red-950     text-red-300';
}

function keyStatLabel(pStats, player) {
  if (!pStats || !player) return null;
  const pos = player.position;
  if (pos === 'S') return pStats.ast != null ? `${Math.round(pStats.ast)} AST` : null;
  if (pos === 'L' || pos === 'DS')
    return pStats.apr != null ? `${pStats.apr.toFixed(2)} APR` : null;
  if (pStats.ta > 0)
    return `${(((pStats.k - pStats.ae) / pStats.ta) * 100).toFixed(0)}% HIT`;
  if (pos === 'MB' && pStats.bs != null) return `${Math.round(pStats.bs)} BS`;
  return null;
}

export function RotationOptimizerPage() {
  const { teamId } = useParams();
  const tid = Number(teamId);

  // serve-order slots: index 0 = S1 (server), …, 5 = S6. Value = player id or null.
  const [slots, setSlots]               = useState(Array(6).fill(null));
  const [activeRotation, setActive]     = useState(1);
  const [pickerCell, setPickerCell]     = useState(null); // grid cell index
  const [saveOpen, setSaveOpen]         = useState(false);
  const [saveName, setSaveName]         = useState('');
  const [saving, setSaving]             = useState(false);
  const [rotStats, setRotStats]         = useState(null); // { '1': {so_pct,bp_pct,...} }
  const [playerStats, setPlayerStats]   = useState({});
  const [statsLoading, setStatsLoading] = useState(false);

  const players = useLiveQuery(
    () => db.players.where('team_id').equals(tid).filter(p => p.is_active).toArray(),
    [tid]
  );

  const savedLineups = useLiveQuery(
    () => db.saved_lineups.where('team_id').equals(tid).toArray(),
    [tid]
  );

  const seasons = useLiveQuery(
    () => db.seasons.where('team_id').equals(tid).toArray(),
    [tid]
  );

  const latestSeason = useMemo(() => {
    if (!seasons?.length) return null;
    return [...seasons].sort((a, b) => b.id - a.id)[0];
  }, [seasons]);

  useEffect(() => {
    if (!latestSeason) return;
    setStatsLoading(true);
    db.matches.where('season_id').equals(latestSeason.id).toArray()
      .then(async (matches) => {
        if (!matches.length) return;
        const ids = matches.map(m => m.id);
        const [contacts, rallies, positions] = await Promise.all([
          getContactsForMatches(ids),
          getRalliesForMatches(ids),
          getPlayerPositionsForMatches(ids),
        ]);
        setRotStats(computeRotationStats(rallies).rotations);
        setPlayerStats(computePlayerStats(contacts, 1, positions));
      })
      .finally(() => setStatsLoading(false));
  }, [latestSeason?.id]);

  const playerMap = useMemo(() => {
    const m = {};
    for (const p of players ?? []) m[p.id] = p;
    return m;
  }, [players]);

  const assignedSet = useMemo(() => new Set(slots.filter(Boolean)), [slots]);

  function assignPlayer(pid, gridCell) {
    const si = slotIdxForCell(gridCell, activeRotation);
    setSlots(prev => {
      const next = [...prev];
      const was = next.indexOf(pid);
      if (was !== -1) next[was] = null;
      next[si] = pid;
      return next;
    });
    setPickerCell(null);
  }

  function clearCell(gridCell) {
    const si = slotIdxForCell(gridCell, activeRotation);
    setSlots(prev => { const n = [...prev]; n[si] = null; return n; });
  }

  async function handleSave() {
    const name = saveName.trim();
    if (!name) return;
    setSaving(true);
    try {
      await db.saved_lineups.add({
        team_id:          tid,
        name,
        serve_order:      slots.map(id => id ?? 0),
        start_zone:       1,
        libero_player_id: null,
        slot_positions:   Array(6).fill(''),
      });
      setSaveOpen(false);
      setSaveName('');
    } finally {
      setSaving(false);
    }
  }

  function loadSaved(sl) {
    setSlots(sl.serve_order.map(id => id || null));
    setActive(1);
  }

  if (!players) {
    return <div className="flex items-center justify-center h-48"><Spinner /></div>;
  }

  const activeRot = rotStats?.[activeRotation] ?? rotStats?.[String(activeRotation)];

  return (
    <div className="pb-8">
      <PageHeader title="Rotation Optimizer" backTo={`/teams/${teamId}`} />

      {/* ── Rotation selector strip ── */}
      <div className="grid grid-cols-6 gap-px bg-slate-700 mx-4 mt-4 rounded-xl overflow-hidden">
        {[1, 2, 3, 4, 5, 6].map(r => {
          const rs   = rotStats?.[r] ?? rotStats?.[String(r)];
          const pct  = rs?.so_pct ?? null;
          const active = r === activeRotation;
          return (
            <button
              key={r}
              onClick={() => setActive(r)}
              className={`flex flex-col items-center py-2 transition-colors ${
                active ? 'bg-primary/20 ring-1 ring-inset ring-primary' : rotBg(pct)
              }`}
            >
              <span className={`text-xs font-bold ${active ? 'text-primary' : ''}`}>R{r}</span>
              {pct != null
                ? <span className={`text-[10px] tabular-nums ${active ? 'text-primary' : ''}`}>{(pct * 100).toFixed(0)}%</span>
                : <span className="text-[10px] text-slate-600">—</span>
              }
            </button>
          );
        })}
      </div>

      {/* SO% / BP% detail row */}
      <div className="flex gap-6 px-4 mt-2 text-sm">
        {activeRot ? (
          <>
            <span className="text-slate-400">
              SO% <span className="text-white font-semibold">{(activeRot.so_pct * 100).toFixed(1)}%</span>
              <span className="text-slate-600 ml-1">({activeRot.so_win}/{activeRot.so_opp})</span>
            </span>
            <span className="text-slate-400">
              BP% <span className="text-white font-semibold">{(activeRot.bp_pct * 100).toFixed(1)}%</span>
              <span className="text-slate-600 ml-1">({activeRot.bp_win}/{activeRot.bp_opp})</span>
            </span>
          </>
        ) : statsLoading ? (
          <span className="text-slate-500 text-xs">Loading season stats…</span>
        ) : (
          <span className="text-slate-500 text-xs">No match data for this rotation yet</span>
        )}
      </div>

      {/* ── Court grid ── */}
      <div className="mx-4 mt-3">
        <div className="text-[10px] text-slate-600 text-center mb-1 tracking-widest font-mono uppercase">Net ↑</div>
        <div className="grid grid-cols-3 grid-rows-2 gap-px bg-slate-700 rounded-xl overflow-hidden">
          {GRID_ORDER.map((_, g) => {
            const si     = slotIdxForCell(g, activeRotation);
            const pid    = slots[si];
            const player = pid ? playerMap[pid] : null;
            const pStats = pid ? (playerStats[pid] ?? playerStats[String(pid)]) : null;
            const keyStat = keyStatLabel(pStats, player);
            const isServer = CELL_LABELS[g] === 'S1';
            return (
              <button
                key={g}
                onClick={() => setPickerCell(g)}
                className={`bg-surface min-h-[84px] flex flex-col items-center justify-center px-1 py-2 gap-0.5
                  transition-colors hover:bg-slate-700 active:scale-95
                  ${isServer ? 'ring-1 ring-inset ring-primary/50' : ''}`}
              >
                <span className="text-[9px] text-slate-700 font-mono">{CELL_LABELS[g]}{isServer ? '★' : ''}</span>
                {player ? (
                  <>
                    <span className="text-xs font-bold text-primary">#{player.jersey_number}</span>
                    <span className="text-xs text-white font-semibold leading-tight text-center">
                      {player.name.split(' ').slice(-1)[0]}
                    </span>
                    <span className="text-[10px] text-slate-500">{player.position}</span>
                    {keyStat && (
                      <span className="text-[10px] text-emerald-400 font-semibold">{keyStat}</span>
                    )}
                  </>
                ) : (
                  <span className="text-slate-700 text-2xl leading-none">+</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="text-[10px] text-slate-600 text-center mt-1 tracking-widest font-mono uppercase">Bench ↓</div>
      </div>

      {/* ── Legend ── */}
      <div className="flex gap-3 px-4 mt-3 text-[10px]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />SO% ≥ 50%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />42–49%</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{'< 42%'}</span>
      </div>

      {/* ── Save / Load ── */}
      <div className="flex gap-2 px-4 mt-4">
        <button
          onClick={() => setSaveOpen(v => !v)}
          className="flex-1 py-2 rounded-lg text-sm font-semibold bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors"
        >
          Save Lineup
        </button>
        {(savedLineups ?? []).length > 0 && (
          <select
            className="flex-1 py-2 rounded-lg text-sm bg-surface border border-slate-600 text-slate-300 px-2"
            defaultValue=""
            onChange={e => {
              const sl = (savedLineups ?? []).find(s => s.id === Number(e.target.value));
              if (sl) loadSaved(sl);
              e.target.value = '';
            }}
          >
            <option value="" disabled>Load saved…</option>
            {(savedLineups ?? []).map(sl => (
              <option key={sl.id} value={sl.id}>{sl.name}</option>
            ))}
          </select>
        )}
      </div>

      {saveOpen && (
        <div className="mx-4 mt-2 flex gap-2">
          <input
            autoFocus
            className="flex-1 px-3 py-2 rounded-lg bg-surface border border-slate-600 text-white text-sm placeholder:text-slate-500"
            placeholder="Lineup name…"
            value={saveName}
            onChange={e => setSaveName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          />
          <button
            onClick={handleSave}
            disabled={saving || !saveName.trim()}
            className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-white disabled:opacity-50"
          >
            Save
          </button>
        </div>
      )}

      {/* ── Player picker sheet ── */}
      {pickerCell !== null && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end"
          onClick={() => setPickerCell(null)}
        >
          <div
            className="bg-bg rounded-t-2xl max-h-[65vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-slate-800 shrink-0">
              <span className="font-bold text-white">
                {CELL_LABELS[pickerCell]}{CELL_LABELS[pickerCell] === 'S1' ? ' ★ Server' : ''} — Assign Player
              </span>
              <button onClick={() => setPickerCell(null)} className="text-slate-400 text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto">
              <button
                onClick={() => { clearCell(pickerCell); setPickerCell(null); }}
                className="w-full text-left px-4 py-3 text-slate-500 hover:bg-slate-800 border-b border-slate-800 text-sm"
              >
                — Clear slot
              </button>
              {(players ?? [])
                .slice()
                .sort((a, b) => Number(a.jersey_number) - Number(b.jersey_number))
                .map(p => {
                  const pStats  = playerStats[p.id] ?? playerStats[String(p.id)];
                  const keyStat = keyStatLabel(pStats, p);
                  const assigned = assignedSet.has(p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => assignPlayer(p.id, pickerCell)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left
                        hover:bg-slate-800 border-b border-slate-800/50 transition-colors
                        ${assigned ? 'opacity-40' : ''}`}
                    >
                      <span className="text-primary font-mono font-bold w-8 shrink-0">#{p.jersey_number}</span>
                      <span className="flex-1 text-white font-semibold">{p.name}</span>
                      <span className="text-slate-500 text-sm">{p.position}</span>
                      {keyStat && (
                        <span className="text-emerald-400 text-sm font-semibold">{keyStat}</span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
