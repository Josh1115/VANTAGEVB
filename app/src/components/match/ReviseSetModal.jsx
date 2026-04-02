import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../../store/matchStore';

export function ReviseSetModal({ set, matchId, onClose, onBoxScore }) {
  const navigate   = useNavigate();
  const reviseSet  = useMatchStore((s) => s.reviseSet);
  const deleteSet  = useMatchStore((s) => s.deleteSet);
  const [clearing,  setClearing]  = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);

  const handleLiveEntry = async () => {
    setClearing(true);
    try {
      await reviseSet(set.id);
      navigate(`/matches/${matchId}/set-lineup?revise=1&setId=${set.id}`);
    } finally {
      setClearing(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteSet(set.id);
      onClose();
    } finally {
      setDeleting(false);
    }
  };

  const busy = clearing || deleting;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-sm p-5 space-y-4">

        {!confirmDel ? (
          <>
            <div>
              <h2 className="text-lg font-bold text-white">Revise Set {set.set_number}</h2>
              <p className="text-sm text-slate-400 mt-1">
                Current score: {set.our_score}–{set.opp_score}. All stats for this set will be
                cleared and you will re-enter the lineup.
              </p>
            </div>

            <div className="space-y-3">
              <button
                disabled={busy}
                onClick={handleLiveEntry}
                className="w-full py-3 px-4 bg-primary hover:brightness-110 text-white font-bold rounded-xl text-sm tracking-wide disabled:opacity-50"
              >
                {clearing ? 'Clearing…' : 'Live Entry'}
                <span className="block text-xs font-normal text-orange-200/70 mt-0.5">
                  Use the full court interface to re-enter stats
                </span>
              </button>

              <button
                disabled={busy}
                onClick={() => onBoxScore(set)}
                className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-sm tracking-wide disabled:opacity-50"
              >
                Manual Box Score
                <span className="block text-xs font-normal text-slate-400 mt-0.5">
                  Enter per-player stat totals and set score directly
                </span>
              </button>

              <button
                disabled={busy}
                onClick={() => setConfirmDel(true)}
                className="w-full py-2.5 px-4 bg-red-900/40 hover:bg-red-900/60 border border-red-700/50 text-red-400 font-semibold rounded-xl text-sm disabled:opacity-50"
              >
                Delete Set {set.set_number}
              </button>
            </div>

            <button onClick={onClose} className="w-full py-2 text-sm text-slate-500 hover:text-slate-300">
              Cancel
            </button>
          </>
        ) : (
          <>
            <div>
              <h2 className="text-lg font-bold text-white">Delete Set {set.set_number}?</h2>
              <p className="text-sm text-slate-400 mt-1">
                This permanently removes Set {set.set_number} and all its contacts, rallies,
                and lineups. This cannot be undone.
              </p>
            </div>

            <div className="space-y-3">
              <button
                disabled={deleting}
                onClick={handleDelete}
                className="w-full py-3 px-4 bg-red-700 hover:bg-red-600 text-white font-bold rounded-xl text-sm disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : `Yes, Delete Set ${set.set_number}`}
              </button>
              <button
                disabled={deleting}
                onClick={() => setConfirmDel(false)}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
