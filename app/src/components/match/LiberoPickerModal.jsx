import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useMatchStore } from '../../store/matchStore';
import { db } from '../../db/schema';

export function LiberoPickerModal({ onClose, onPick, slot = 1, excludeId }) {
  const teamId = useMatchStore((s) => s.teamId);

  const roster = useLiveQuery(
    () => teamId ? db.players.where('team_id').equals(teamId).filter((p) => p.is_active).toArray() : [],
    [teamId]
  );
  const eligible = (roster ?? []).filter((p) => p.id !== excludeId);

  return (
    <Modal
      title={slot === 2 ? 'Assign 2nd Libero' : 'Assign Libero'}
      onClose={onClose}
      footer={<Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>}
    >
      <div className="space-y-3">
        <p className="text-xs text-slate-400">
          {slot === 2
            ? 'Select the second dressed libero (IHSA two-libero rule). Only one is on court at a time.'
            : 'Select the player to designate as libero for this set.'}
        </p>
        {!eligible || eligible.length === 0 ? (
          <p className="text-xs text-slate-500">No players found.</p>
        ) : (
          <div className="grid grid-cols-3 gap-1.5">
            {eligible.map((p) => (
              <button
                key={p.id}
                onClick={() => onPick(p)}
                className="px-2 py-1.5 rounded text-xs font-bold border transition-colors text-left bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600"
              >
                #{p.jersey_number} {p.name}
                <span className="block text-[1.3vmin] text-slate-400">{p.position}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
