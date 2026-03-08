import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useMatchStore } from '../../store/matchStore';
import { db } from '../../db/schema';

export function SubstitutionModal({ onClose }) {
  const lineup           = useMatchStore((s) => s.lineup);
  const teamId           = useMatchStore((s) => s.teamId);
  const substitutePlayer = useMatchStore((s) => s.substitutePlayer);
  const [outPlayerId, setOutPlayerId] = useState(null);
  const [inPlayerId,  setInPlayerId]  = useState(null);

  // All active roster players for this team
  const roster = useLiveQuery(
    () => teamId ? db.players.where('team_id').equals(teamId).filter((p) => p.is_active).toArray() : [],
    [teamId]
  );

  const onCourtIds = new Set(lineup.map((sl) => sl.playerId).filter(Boolean));
  const bench = (roster ?? []).filter((p) => !onCourtIds.has(p.id));

  const handleConfirm = async () => {
    if (!outPlayerId || !inPlayerId) return;
    const inPlayer = bench.find((p) => p.id === inPlayerId);
    if (!inPlayer) return;
    const ok = await substitutePlayer(outPlayerId, inPlayer);
    if (ok) onClose();
  };

  return (
    <Modal
      title="Substitution"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            disabled={!outPlayerId || !inPlayerId}
            onClick={handleConfirm}
          >
            Confirm Sub
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Who goes out */}
        <div>
          <p className="text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">Player Out</p>
          <div className="grid grid-cols-3 gap-1.5">
            {lineup.filter((sl) => sl.playerId).map((sl) => (
              <button
                key={sl.playerId}
                onClick={() => { setOutPlayerId(sl.playerId); setInPlayerId(null); }}
                className={`px-2 py-1.5 rounded text-xs font-bold border transition-colors text-left
                  ${outPlayerId === sl.playerId
                    ? 'bg-primary text-white border-primary'
                    : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
                  }`}
              >
                <span className="block text-[1.3vmin] text-slate-400">S{sl.position}</span>
                #{sl.jersey} {sl.playerName}
              </button>
            ))}
          </div>
        </div>

        {/* Who comes in */}
        {outPlayerId && (
          <div>
            <p className="text-xs text-slate-400 mb-1.5 font-semibold uppercase tracking-wide">Player In</p>
            {bench.length === 0 ? (
              <p className="text-xs text-slate-500">No bench players available.</p>
            ) : (
              <div className="grid grid-cols-3 gap-1.5">
                {bench.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setInPlayerId(p.id)}
                    className={`px-2 py-1.5 rounded text-xs font-bold border transition-colors text-left
                      ${inPlayerId === p.id
                        ? 'bg-primary text-white border-primary'
                        : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
                      }`}
                  >
                    #{p.jersey_number} {p.name}
                    <span className="block text-[1.3vmin] text-slate-400">{p.position}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
