import { useEffect, useState } from 'react';
import { CourtZonePicker, ROMAN } from '../court/CourtZonePicker';

const POSITION_OPTIONS = ['OH', 'OPP', 'MB', 'S', 'L', 'DS', 'RS'];

/**
 * Shared lineup builder UI — serve order list, libero picker, starting zone picker.
 *
 * Props:
 *   lineup         — string[6], playerId per serve slot ('' = unassigned)
 *   setLineup      — setter for lineup
 *   slotPositions  — string[6], position label per serve slot ('' = unassigned)
 *   setSlotPositions — setter for slotPositions
 *   startZone      — number (1-6), court zone where Player I starts
 *   setStartZone   — setter for startZone
 *   liberoId       — string, selected libero player id ('' = none)
 *   setLiberoId    — setter for liberoId
 *   players        — Player[] from DB (active roster)
 */
export function LineupForm({ lineup, setLineup, slotPositions, setSlotPositions, startZone, setStartZone, liberoId, setLiberoId, players }) {
  const [draggingIdx, setDraggingIdx] = useState(null);
  const [dragOverIdx, setDragOverIdx] = useState(null);

  const swapSlots = (from, to) => {
    const swapArr = (arr) => { const n = [...arr]; [n[from], n[to]] = [n[to], n[from]]; return n; };
    setLineup(swapArr);
    setSlotPositions(swapArr);
  };

  // Auto-select first player with position 'L' as libero when roster loads
  useEffect(() => {
    if (!players) return;
    const lib = players.find((p) => p.position === 'L');
    setLiberoId(lib ? String(lib.id) : '');
  }, [players]);

  // Back-fill any slot that has a player but no position assigned.
  // Runs when players load OR when lineup changes (e.g. loading a saved lineup).
  useEffect(() => {
    if (!players?.length) return;
    setSlotPositions((prev) => {
      let changed = false;
      const next = prev.map((pos, i) => {
        if (!pos && lineup[i]) {
          const p = players.find((pl) => String(pl.id) === lineup[i]);
          if (p?.position) { changed = true; return p.position; }
        }
        return pos;
      });
      return changed ? next : prev;
    });
  }, [players, lineup]);

  const assignPlayer = (slotIdx, playerId) => {
    setLineup((prev) => {
      const next = [...prev];
      for (let i = 0; i < next.length; i++) if (next[i] === playerId) next[i] = '';
      next[slotIdx] = playerId;
      return next;
    });
    // Auto-populate position from player's default
    if (playerId && players) {
      const p = players.find((pl) => String(pl.id) === playerId);
      if (p?.position) {
        setSlotPositions((prev) => {
          const next = [...prev];
          next[slotIdx] = p.position;
          return next;
        });
      }
    }
  };

  const assignPosition = (slotIdx, pos) => {
    setSlotPositions((prev) => {
      const next = [...prev];
      next[slotIdx] = pos;
      return next;
    });
  };

  return (
    <div className="space-y-5">

      {/* Serve Order */}
      <div>
        <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
          Serve Order
        </label>
        <p className="text-[11px] text-slate-500 mb-2">
          I serves first. Assign players in the order they will rotate through the serve.
        </p>
        <div
          className="space-y-2"
          onPointerLeave={() => { setDraggingIdx(null); setDragOverIdx(null); }}
        >
          {ROMAN.map((roman, i) => (
            <div
              key={roman}
              className={`flex items-center gap-2 rounded px-1 transition-colors
                ${dragOverIdx === i && draggingIdx !== i ? 'bg-slate-700/60 ring-1 ring-primary/60' : ''}`}
              onPointerEnter={() => { if (draggingIdx !== null) setDragOverIdx(i); }}
            >
              <span
                className="text-slate-500 hover:text-slate-300 cursor-grab px-1 select-none touch-none text-[1.6vmin]"
                onPointerDown={(e) => { e.preventDefault(); setDraggingIdx(i); setDragOverIdx(i); }}
                onPointerUp={() => {
                  if (draggingIdx !== null && dragOverIdx !== null && draggingIdx !== dragOverIdx)
                    swapSlots(draggingIdx, dragOverIdx);
                  setDraggingIdx(null); setDragOverIdx(null);
                }}
              >⠿</span>
              <span className="text-base text-orange-400 font-black w-8 shrink-0 text-right">{roman}</span>
              <select
                value={lineup[i]}
                onChange={(e) => assignPlayer(i, e.target.value)}
                className="flex-1 bg-surface border border-slate-600 text-white rounded px-2 py-2 text-sm focus:outline-none focus:border-primary"
              >
                <option value="">— pick player —</option>
                {(players ?? []).map((p) => (
                  <option
                    key={p.id}
                    value={p.id}
                    disabled={lineup.includes(String(p.id)) && lineup[i] !== String(p.id)}
                  >
                    #{p.jersey_number} {p.name}
                  </option>
                ))}
              </select>
              <select
                value={slotPositions?.[i] ?? ''}
                onChange={(e) => assignPosition(i, e.target.value)}
                className="w-20 bg-surface border border-slate-600 text-white rounded px-2 py-2 text-sm focus:outline-none focus:border-primary"
              >
                <option value="">—</option>
                {POSITION_OPTIONS.map((pos) => (
                  <option key={pos} value={pos}>{pos}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      </div>

      {/* Libero designation */}
      <div>
        <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
          Libero
        </label>
        <p className="text-[11px] text-slate-500 mb-2">
          Optional. The libero does not occupy a serve order position.
        </p>
        <select
          value={liberoId}
          onChange={(e) => setLiberoId(e.target.value)}
          className="w-full bg-surface border border-slate-600 text-white rounded px-2 py-2 text-sm focus:outline-none focus:border-primary"
        >
          <option value="">— No libero —</option>
          {(players ?? []).map((p) => (
            <option key={p.id} value={p.id}>
              #{p.jersey_number} {p.name} ({p.position})
            </option>
          ))}
        </select>
      </div>

      {/* Starting zone picker */}
      <div>
        <label className="block text-xs text-slate-400 mb-1 font-semibold uppercase tracking-wide">
          Where Does Player I Start?
        </label>
        <p className="text-[11px] text-slate-500 mb-2">
          Tap the court zone where Player I will be standing at the start of the set.
          All other players' positions are computed from this.
        </p>
        <CourtZonePicker
          value={startZone}
          onChange={setStartZone}
          serveOrder={lineup}
          players={players}
        />
      </div>

    </div>
  );
}
