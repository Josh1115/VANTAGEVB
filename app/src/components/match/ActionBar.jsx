import { memo, useRef, useState } from 'react';
import { HoldProgressRing } from '../ui/HoldProgressRing';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../../store/matchStore';
import { useUiStore } from '../../store/uiStore';


const HOLD_MS = 450;

function useHoldButton(onFire) {
  const timerRef    = useRef(null);
  const [held, setHeld] = useState(false);

  const onDown = (e) => {
    e.preventDefault();
    setHeld(true);
    timerRef.current = setTimeout(() => { setHeld(false); onFire(); }, HOLD_MS);
  };
  const onUp = () => {
    clearTimeout(timerRef.current);
    setHeld(false);
  };

  return { onDown, onUp, held };
}


export const ActionBar = memo(function ActionBar({ onSubOpen, onMenuOpen, onStatsOpen, onSummaryOpen, liberoPlayer, onLiberoIn, onRotErrOpen, alertCount = 0 }) {
  const navigate       = useNavigate();
  const rotateForward  = useMatchStore((s) => s.rotateForward);
  const rotateBackward = useMatchStore((s) => s.rotateBackward);
  const undoLast       = useMatchStore((s) => s.undoLast);
  const subsUsed       = useMatchStore((s) => s.subsUsed);
  const maxSubsPerSet  = useMatchStore((s) => s.maxSubsPerSet);
  const actionHistory  = useMatchStore((s) => s.actionHistory);
  const showToast      = useUiStore((s) => s.showToast);

  const lastFeedItem   = useMatchStore((s) => s.lastFeedItem);
  const liberoOnCourt  = useMatchStore((s) => s.liberoOnCourt);
  const swapLibero     = useMatchStore((s) => s.swapLibero);
  const lineup         = useMatchStore((s) => s.lineup);

  const backHold = useHoldButton(rotateBackward);
  const fwdHold  = useHoldButton(rotateForward);

  const canSwapLibero = liberoPlayer && (liberoOnCourt || [4, 5].some(
    (i) => lineup[i]?.playerId && lineup[i].playerId !== liberoPlayer.id
  ));

  const lastAction = actionHistory[0] ?? null;

  const subsMaxed = subsUsed >= maxSubsPerSet;

  // Derive a short label for the UNDO button from the last action
  let undoLabel = null;
  if (lastAction) {
    if (lastAction.type === 'point_us')         undoLabel = '+1';
    else if (lastAction.type === 'point_them')  undoLabel = 'PT';
    else if (lastAction.type === 'timeout')     undoLabel = 'TO';
    else if (lastAction.type === 'sub')         undoLabel = 'SUB';
    else if (lastAction.type === 'libero_swap') undoLabel = 'LIB';
    else if (lastAction.type === 'fudge')       undoLabel = 'ADJ';
    else if (lastFeedItem?.label) {
      // Feed format: "[+1 ]LastName ActionDesc" — drop the +1 prefix and first word (last name)
      const stripped = lastFeedItem.label.replace(/^\+1 /, '');
      const parts    = stripped.split(' ');
      undoLabel = parts.slice(1).join(' ') || parts[0];
    }
  }

  const handleSub = () => {
    if (subsMaxed) { showToast(`Substitution limit reached (${maxSubsPerSet}/set)`, 'error'); return; }
    onSubOpen();
  };

  const btnBase = 'flex-1 h-full flex flex-col items-center justify-center font-bold rounded-none select-none transition-[transform,filter,background-color] duration-75 active:brightness-75 active:scale-y-90 active:scale-x-[0.97] border-r border-slate-700 last:border-r-0';

  return (
    <div className="flex-none flex-col border-t border-slate-700 bg-surface">
    <div className="flex h-[3.65vmin]">

      {/* Rotate backward — hold to confirm */}
      <button
        onPointerDown={backHold.onDown}
        onPointerUp={backHold.onUp}
        onPointerLeave={backHold.onUp}
        className={`${btnBase} hover:bg-slate-700 relative overflow-hidden
          ${backHold.held ? 'bg-slate-600 text-orange-300' : 'bg-slate-800 text-slate-300'}`}
      >
        <HoldProgressRing active={backHold.held} durationMs={HOLD_MS} />
        <span className={`text-[1.53vmin] leading-none ${backHold.held ? 'text-orange-400' : 'text-slate-500'}`}>ROT BACK</span>
      </button>

      {/* Rotate forward — hold to confirm */}
      <button
        onPointerDown={fwdHold.onDown}
        onPointerUp={fwdHold.onUp}
        onPointerLeave={fwdHold.onUp}
        className={`${btnBase} hover:bg-slate-700 relative overflow-hidden
          ${fwdHold.held ? 'bg-slate-600 text-orange-300' : 'bg-slate-800 text-slate-300'}`}
      >
        <HoldProgressRing active={fwdHold.held} durationMs={HOLD_MS} />
        <span className={`text-[1.53vmin] leading-none ${fwdHold.held ? 'text-orange-400' : 'text-slate-500'}`}>ROT FWD</span>
      </button>

      {/* Undo */}
      <button
        onPointerDown={(e) => { e.preventDefault(); undoLast(); }}
        disabled={!lastAction}
        className={`${btnBase} bg-slate-800 hover:bg-slate-700
          ${lastAction ? 'text-yellow-400' : 'text-slate-600'}`}
      >
        <span className="text-[1.53vmin] font-bold leading-none">UNDO</span>
        {undoLabel && (
          <span className="text-[1.45vmin] leading-none mt-0.5 text-yellow-300/70 truncate max-w-full px-1">
            {undoLabel}
          </span>
        )}
      </button>

      {/* Sub */}
      <button
        onPointerDown={(e) => { e.preventDefault(); handleSub(); }}
        className={`${btnBase} ${subsMaxed ? 'bg-slate-800 text-slate-600' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
      >
        <span className="text-[1.53vmin] leading-none">SUB</span>
      </button>

      {/* Libero swap */}
      {liberoPlayer && (
        <button
          onPointerDown={(e) => {
            e.preventDefault();
            if (!canSwapLibero) return;
            if (liberoOnCourt) swapLibero(liberoPlayer); else onLiberoIn?.();
          }}
          className={`${btnBase} ${canSwapLibero
            ? liberoOnCourt
              ? 'bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800/70'
              : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
            : 'bg-slate-800 text-slate-700'}`}
        >
          <span className="text-[1.53vmin] leading-none">{liberoOnCourt ? 'LIB ON' : 'LIB OFF'}</span>
        </button>
      )}

      {/* ROT ERR — home team rotation violation */}
      <button
        onPointerDown={(e) => { e.preventDefault(); onRotErrOpen(); }}
        className={`${btnBase} bg-slate-800 text-rose-400 hover:bg-rose-950/60`}
      >
        <span className="text-[1.53vmin] leading-none">ROT ERR</span>
      </button>

      {/* Stats */}
      <div className="relative flex-1 h-full">
        <button
          onPointerDown={(e) => { e.preventDefault(); onStatsOpen(); }}
          className={`${btnBase} w-full bg-slate-800 text-slate-300 hover:bg-slate-700`}
        >
          <span className={`text-[1.53vmin] leading-none ${alertCount > 0 ? 'text-orange-400' : 'text-slate-500'}`}>STATS</span>
        </button>
        {alertCount > 0 && (
          <span className="pointer-events-none absolute top-1 right-1 h-2 w-2 rounded-full bg-orange-400 animate-pulse" />
        )}
      </div>

      {/* Scoring summary */}
      <button
        onPointerDown={(e) => { e.preventDefault(); onSummaryOpen(); }}
        className={`${btnBase} bg-slate-800 text-slate-300 hover:bg-slate-700`}
      >
        <span className="text-[1.53vmin] text-slate-500 leading-none">SCORE</span>
      </button>

      {/* Home */}
      <button
        onPointerDown={(e) => { e.preventDefault(); navigate('/'); }}
        className={`${btnBase} bg-slate-800 text-slate-400 hover:bg-slate-700`}
      >
        <svg className="w-[2.4vmin] h-[2.4vmin]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="1.5" y="4" width="21" height="16" rx="1.5" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5" />
          <rect x="1.5" y="4" width="21" height="4" rx="1.5" fill="currentColor" fillOpacity="0.35" />
          <line x1="12" y1="8" x2="12" y2="20" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          <rect x="4"    y="11" width="3.5" height="5" rx="0.5" fill="currentColor" fillOpacity="0.7" />
          <rect x="8"    y="11" width="2"   height="5" rx="0.5" fill="currentColor" fillOpacity="0.7" />
          <rect x="13.5" y="11" width="2"   height="5" rx="0.5" fill="currentColor" fillOpacity="0.7" />
          <rect x="16.5" y="11" width="3.5" height="5" rx="0.5" fill="currentColor" fillOpacity="0.7" />
        </svg>
      </button>

      {/* Menu */}
      <button
        onPointerDown={(e) => { e.preventDefault(); onMenuOpen(); }}
        className={`${btnBase} bg-slate-800 text-slate-400 hover:bg-slate-700`}
      >
        <svg className="w-[2.4vmin] h-[2.4vmin]" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            fillRule="evenodd"
            fill="currentColor"
            fillOpacity="0.25"
            stroke="currentColor"
            strokeWidth="1.1"
            strokeLinejoin="round"
            d="M10.0,4.8 L10.8,2.6 L13.2,2.6 L14.0,4.8 L15.7,5.5 L17.9,4.5 L19.5,6.2 L18.5,8.3 L19.2,10.0 L21.4,10.8 L21.4,13.2 L19.2,14.0 L18.5,15.7 L19.5,17.9 L17.9,19.5 L15.7,18.5 L14.0,19.2 L13.2,21.4 L10.8,21.4 L10.0,19.2 L8.3,18.5 L6.2,19.5 L4.5,17.9 L5.5,15.7 L4.8,14.0 L2.6,13.2 L2.6,10.8 L4.8,10.0 L5.5,8.3 L4.5,6.2 L6.2,4.5 L8.3,5.5 Z M12,8.5 A3.5,3.5 0 1 1 12,15.5 A3.5,3.5 0 1 1 12,8.5 Z"
          />
        </svg>
      </button>
    </div>
    <div style={{ height: 'env(safe-area-inset-bottom)' }} />
    </div>
  );
});
