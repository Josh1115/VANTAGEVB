import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useMatchStore } from '../../store/matchStore';
import { useShallow } from 'zustand/react/shallow';
import { getStorageItem, STORAGE_KEYS } from '../../utils/storage';
import { fmtPlayerName } from '../../stats/formatters';

// One libero pill — a single tappable button with two stacked lines:
// current status (LIB N/A / LIB READY) on top; below it, this libero's own # and
// name while benched, or the name of the player they're currently standing
// in for while on court (e.g. libero A comes on for Sara → A's box shows
// "Sara" until the libero rotates to the front row and Sara comes back).
// Color marks status: green = benched (available), slate = on court.
function LiberoSlot({ player, isActive, canSwap, onTap, replacedName, replacedJersey, playerNicknames, nameFormat }) {
  const disabled = !isActive && !canSwap;

  // Pulse only THIS pill when ITS OWN status flips — independent of the other libero.
  const [pulse, setPulse] = useState(false);
  const prevActive = useRef(isActive);
  useEffect(() => {
    if (isActive !== prevActive.current) {
      prevActive.current = isActive;
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 450);
      return () => clearTimeout(t);
    }
  }, [isActive]);

  const borderColor = pulse
    ? 'border-emerald-400 animate-libero-pulse'
    : isActive
      ? 'border-slate-500'
      : canSwap ? 'border-emerald-500' : 'border-slate-700';

  const fillColor = isActive
    ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
    : canSwap
      ? 'bg-emerald-800 text-emerald-100 hover:bg-emerald-700'
      : 'bg-transparent text-slate-700 cursor-not-allowed';

  const shownJersey = isActive ? replacedJersey : player.jersey_number;
  const shownName   = isActive ? replacedName   : player.name;
  const shownId      = isActive ? undefined     : player.id; // nickname lookup only applies to the libero themselves

  return (
    <button
      disabled={disabled}
      onPointerDown={(e) => { e.preventDefault(); onTap(); }}
      className={`flex flex-col items-center justify-center gap-0.5 px-2 py-1 min-w-[12.96vmin] rounded border leading-none transition-colors ${borderColor} ${fillColor}`}
    >
      <span className="text-[1.8vmin] font-black tracking-wide">{isActive ? 'LIB N/A' : 'LIB READY'}</span>
      <span className="text-[1.5vmin] font-semibold truncate max-w-[12.96vmin]">
        #{shownJersey} {fmtPlayerName(shownName, playerNicknames[shownId] ?? '', nameFormat)}
      </span>
    </button>
  );
}

export const LiberoBox = memo(function LiberoBox({ liberoPlayer, liberoPlayer2, onAssignLibero, onAssignLibero2 }) {
  const { liberoId, liberoOnCourt, lineup, liberoReplacedName, liberoReplacedJersey, playerNicknames } = useMatchStore(useShallow((s) => ({
    liberoId:              s.liberoId,
    liberoOnCourt:         s.liberoOnCourt,
    lineup:                s.lineup,
    liberoReplacedName:    s.liberoReplacedName,
    liberoReplacedJersey:  s.liberoReplacedJersey,
    playerNicknames:       s.playerNicknames,
  })));
  const swapLibero = useMatchStore((s) => s.swapLibero);

  const nameFormat = useMemo(
    () => getStorageItem(STORAGE_KEYS.PLAYER_NAME_FORMAT, 'initial_last'),
    []
  );

  if (!liberoPlayer) {
    return (
      <div
        className={`flex items-center gap-1.5 px-2 py-0.5 bg-black/30 rounded border transition-colors
          ${onAssignLibero
            ? 'border-slate-600 hover:border-slate-400 hover:bg-black/50 cursor-pointer'
            : 'border-slate-700'
          }`}
        onPointerDown={onAssignLibero ? (e) => { e.preventDefault(); onAssignLibero(); } : undefined}
      >
        <span className="text-sm text-slate-600">○</span>
        <div className="flex flex-col leading-none">
          <span className="text-xs text-slate-500 font-bold">Libero</span>
          <span className="text-xs text-slate-600">{onAssignLibero ? 'tap to assign' : '—'}</span>
        </div>
      </div>
    );
  }

  // Can swap a bench libero in when a non-libero back-row player (S5/S6) is
  // available — or, once a libero is already on court, either dressed libero
  // can always swap directly with whoever's in (no back-row check needed).
  const canSwap = (player) => liberoOnCourt || [4, 5].some(
    (i) => lineup[i]?.playerId && lineup[i].playerId !== player.id
  );

  return (
    <div className="flex items-center gap-1">
      <LiberoSlot
        player={liberoPlayer}
        isActive={liberoOnCourt && liberoId === liberoPlayer.id}
        canSwap={canSwap(liberoPlayer)}
        onTap={() => swapLibero(liberoPlayer)}
        replacedName={liberoReplacedName}
        replacedJersey={liberoReplacedJersey}
        playerNicknames={playerNicknames}
        nameFormat={nameFormat}
      />
      {liberoPlayer2 && (
        <LiberoSlot
          player={liberoPlayer2}
          isActive={liberoOnCourt && liberoId === liberoPlayer2.id}
          canSwap={canSwap(liberoPlayer2)}
          onTap={() => swapLibero(liberoPlayer2)}
          replacedName={liberoReplacedName}
          replacedJersey={liberoReplacedJersey}
          playerNicknames={playerNicknames}
          nameFormat={nameFormat}
        />
      )}
      {!liberoPlayer2 && onAssignLibero2 && (
        <button
          onPointerDown={(e) => { e.preventDefault(); onAssignLibero2(); }}
          className="px-1.5 py-1 rounded border border-dashed border-slate-600 text-slate-500 hover:text-slate-300 hover:border-slate-400 text-[1.6vmin] leading-none"
          title="Assign 2nd libero (IHSA two-libero rule)"
        >
          +L2
        </button>
      )}
    </div>
  );
});
