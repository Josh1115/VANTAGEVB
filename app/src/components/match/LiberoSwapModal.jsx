import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useMatchStore } from '../../store/matchStore';

export function LiberoSwapModal({ liberoPlayer, onClose, onPick }) {
  const lineup   = useMatchStore((s) => s.lineup);
  const liberoId = useMatchStore((s) => s.liberoId);

  // Back-row slots eligible for libero replacement (S5=index 4, S6=index 5, S1=index 0)
  const eligible = [4, 5, 0]
    .map((i) => ({ idx: i, slot: lineup[i] }))
    .filter(({ slot }) => slot.playerId && slot.playerId !== liberoId)
    .sort((a, b) => {
      // MB floats to the top so the default target is the middle blocker
      const aMB = a.slot.positionLabel === 'MB' ? 0 : 1;
      const bMB = b.slot.positionLabel === 'MB' ? 0 : 1;
      return aMB - bMB;
    });

  return (
    <Modal
      title="Libero In — Replace Who?"
      onClose={onClose}
      footer={<Button variant="secondary" onClick={onClose}>Cancel</Button>}
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          Select the back-row player <span className="text-white font-semibold">#{liberoPlayer.jersey_number} {liberoPlayer.name}</span> will replace.
        </p>
        {eligible.length === 0 ? (
          <p className="text-xs text-slate-500">No eligible back-row players found.</p>
        ) : (
          <div className="space-y-2">
            {eligible.map(({ idx, slot }) => (
              <button
                key={idx}
                onClick={() => onPick(idx)}
                className="w-full flex items-center gap-3 bg-slate-700 hover:bg-slate-600 rounded-lg px-4 py-3 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-slate-600 flex items-center justify-center font-mono font-bold text-primary shrink-0 text-sm">
                  #{slot.jersey}
                </div>
                <div>
                  <div className="font-semibold">{slot.playerName}</div>
                  <div className="text-xs text-slate-400">Position S{idx + 1}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
