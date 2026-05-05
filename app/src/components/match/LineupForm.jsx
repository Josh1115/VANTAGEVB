import { useEffect, useRef, useState } from 'react';
import { CourtZonePicker, ROMAN } from '../court/CourtZonePicker';
import { getStorageItem, STORAGE_KEYS } from '../../utils/storage';

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
  const containerRef = useRef(null);
  const rowRefs = useRef([]);
  const draggingIdxRef = useRef(null);
  const dragOverIdxRef = useRef(null);

  const swapSlots = (from, to) => {
    const swapArr = (arr) => { const n = [...arr]; [n[from], n[to]] = [n[to], n[from]]; return n; };
    setLineup(swapArr);
    setSlotPositions(swapArr);
  };

  const handleDragMove = (e) => {
    if (draggingIdxRef.current === null) return;
    for (let i = 0; i < rowRefs.current.length; i++) {
      const rect = rowRefs.current[i]?.getBoundingClientRect();
      if (rect && e.clientY >= rect.top && e.clientY <= rect.bottom) {
        if (dragOverIdxRef.current !== i) {
          dragOverIdxRef.current = i;
          setDragOverIdx(i);
        }
        break;
      }
    }
  };

  const handleDragEnd = () => {
    const from = draggingIdxRef.current;
    const to = dragOverIdxRef.current;
    if (from !== null && to !== null && from !== to) swapSlots(from, to);
    draggingIdxRef.current = null;
    dragOverIdxRef.current = null;
    setDraggingIdx(null);
    setDragOverIdx(null);
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

  const rosterSort = getStorageItem(STORAGE_KEYS.ROSTER_SORT, 'jersey');
  const sortedPlayers = [...(players ?? [])].sort((a, b) => {
    if (rosterSort === 'first') return a.name.split(' ')[0].localeCompare(b.name.split(' ')[0]);
    if (rosterSort === 'last')  return a.name.split(' ').pop().localeCompare(b.name.split(' ').pop());
    return (a.jersey_number ?? 0) - (b.jersey_number ?? 0);
  });

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
          ref={containerRef}
          className="space-y-2"
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
          onPointerLeave={handleDragEnd}
        >
          {ROMAN.map((roman, i) => (
            <div
              key={roman}
              ref={(el) => { rowRefs.current[i] = el; }}
              className={`flex items-center gap-2 rounded px-1 transition-colors
                ${dragOverIdx === i && draggingIdx !== i ? 'bg-slate-700/60 ring-1 ring-primary/60' : ''}`}
            >
              <span
                className={`px-1 select-none touch-none text-[1.6vmin] ${draggingIdx !== null ? 'cursor-grabbing' : 'cursor-grab'} text-slate-500 hover:text-slate-300`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  containerRef.current?.setPointerCapture(e.pointerId);
                  draggingIdxRef.current = i;
                  dragOverIdxRef.current = i;
                  setDraggingIdx(i);
                  setDragOverIdx(i);
                }}
              >⠿</span>
              <span className="text-base text-orange-400 font-black w-8 shrink-0 text-right">{roman}</span>
              <select
                value={lineup[i]}
                onChange={(e) => assignPlayer(i, e.target.value)}
                className="flex-1 bg-surface border border-slate-600 text-white rounded px-2 py-2 text-sm focus:outline-none focus:border-primary"
              >
                <option value="">— pick player —</option>
                {sortedPlayers.map((p) => (
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
          {sortedPlayers.map((p) => (
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

        {/* Rotation number buttons — alternative to tapping the court */}
        <div className="mt-3">
          <p className="text-[11px] text-slate-500 mb-1.5">Or pick starting rotation:</p>
          <div className="flex gap-1.5">
            {[1, 2, 3, 4, 5, 6].map((rot) => {
              const zone = ((8 - rot) % 6) || 6;
              const isActive = startZone === zone;
              return (
                <button
                  key={rot}
                  type="button"
                  onClick={() => setStartZone(zone)}
                  className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-colors
                    ${isActive
                      ? 'bg-primary/20 text-primary border-primary/50'
                      : 'bg-surface text-slate-400 border-slate-600 hover:border-slate-400 hover:text-slate-200'
                    }`}
                >
                  {rot}
                </button>
              );
            })}
          </div>
        </div>

        {(() => {
          const rotNum = ((1 - startZone + 6) % 6) + 1;
          const isServing = startZone === 1;
          return (
            <div className="mt-2 flex items-center gap-2">
              <span
                className="text-xs font-black tracking-widest px-2.5 py-1 rounded-lg bg-primary/20 text-primary border border-primary/30"
                style={{ fontFamily: "'Orbitron', sans-serif" }}
              >
                ROT {rotNum} START
              </span>
              <span className="text-[11px] text-slate-500">
                {isServing ? 'Serving to start' : `Receiving to start — Player I serves first in ROT 1`}
              </span>
            </div>
          );
        })()}
      </div>

    </div>
  );
}
