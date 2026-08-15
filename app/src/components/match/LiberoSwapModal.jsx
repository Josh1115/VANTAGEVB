import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useMatchStore } from '../../store/matchStore';
import { useShallow } from 'zustand/react/shallow';

// "LIB SWAP" picker — two steps:
//   1. Which dressed libero is swapping? (skipped internally when a libero is
//      already on court — tapping either one resolves immediately, since
//      swapLibero() knows how to swap them out or direct-swap the other in
//      without needing a target position)
//   2. If nobody's on court yet: which back-row player do they replace?
export function LiberoSwapModal({ liberoPlayer, liberoPlayer2, onClose, onConfirm }) {
  const { lineup, liberoOnCourt, liberoId } = useMatchStore(useShallow((s) => ({
    lineup:        s.lineup,
    liberoOnCourt: s.liberoOnCourt,
    liberoId:      s.liberoId,
  })));
  const dressedLiberos = [liberoPlayer, liberoPlayer2].filter(Boolean);
  const [selected, setSelected] = useState(null);

  const pickLibero = (player) => {
    if (liberoOnCourt) {
      onConfirm(player); // already someone on court — swap out or direct-swap, no target needed
    } else {
      setSelected(player);
    }
  };

  // Step 1 — which libero?
  if (!selected) {
    return (
      <Modal title="Libero Swap" onClose={onClose} footer={<Button variant="secondary" onClick={onClose}>Cancel</Button>}>
        <div className="space-y-3">
          <p className="text-xs text-slate-400">Which libero is swapping?</p>
          <div className="space-y-2">
            {dressedLiberos.map((p) => (
              <button
                key={p.id}
                onClick={() => pickLibero(p)}
                className="w-full flex items-center gap-3 bg-slate-700 hover:bg-slate-600 rounded-lg px-4 py-3 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center font-mono font-bold text-primary shrink-0 text-sm">
                  #{p.jersey_number}
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{p.name}</div>
                  {liberoOnCourt && (
                    <div className="text-xs text-slate-400">{liberoId === p.id ? 'On court' : 'Bench'}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </Modal>
    );
  }

  // Step 2 — which on-court player do they replace? All 6 positions are
  // selectable (not just back row) — Vantage tracks libero swaps, it doesn't
  // enforce where they're legal to happen.
  const eligible = lineup
    .map((slot, idx) => ({ idx, slot }))
    .filter(({ slot }) => slot.playerId && slot.playerId !== selected.id);

  return (
    <Modal
      title="Libero In — Replace Who?"
      onClose={onClose}
      footer={
        <Button variant="secondary" onClick={dressedLiberos.length > 1 ? () => setSelected(null) : onClose}>
          {dressedLiberos.length > 1 ? 'Back' : 'Cancel'}
        </Button>
      }
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          Select the player <span className="text-white font-semibold">#{selected.jersey_number} {selected.name}</span> will replace.
          A libero can only take the court in the back row — pick a front-row player and the swap queues automatically for the moment they rotate back.
        </p>
        {eligible.length === 0 ? (
          <p className="text-xs text-slate-500">No eligible players found.</p>
        ) : (
          <div className="space-y-2">
            {eligible.map(({ idx, slot }) => {
              const isBackRow = slot.position === 1 || slot.position === 5 || slot.position === 6;
              return (
                <button
                  key={idx}
                  onClick={() => onConfirm(selected, idx)}
                  className="w-full flex items-center gap-3 bg-slate-700 hover:bg-slate-600 rounded-lg px-4 py-3 text-left transition-colors"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center font-mono font-bold text-primary shrink-0 text-sm">
                    #{slot.jersey}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{slot.playerName}</div>
                    <div className="text-xs text-slate-400">Position S{idx + 1}</div>
                  </div>
                  {!isBackRow && (
                    <div className="text-[10px] text-amber-400 font-semibold uppercase tracking-wide shrink-0">
                      Queues for back row
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
