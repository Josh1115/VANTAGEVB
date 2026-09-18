import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMatchStore } from '../../store/matchStore';
import { useShallow } from 'zustand/react/shallow';

export function ReviseSetModal({ set, matchId, onClose, onBoxScore }) {
  const navigate   = useNavigate();
  const { reviseSet, deleteSet, correctSetScore } = useMatchStore(useShallow((s) => ({
    reviseSet: s.reviseSet,
    deleteSet: s.deleteSet,
    correctSetScore: s.correctSetScore,
  })));
  const [clearing,  setClearing]  = useState(false);
  const [deleting,  setDeleting]  = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [fixingScore, setFixingScore] = useState(false);
  const [ourScoreInput, setOurScoreInput] = useState(String(set.our_score));
  const [oppScoreInput, setOppScoreInput] = useState(String(set.opp_score));
  const [savingScore, setSavingScore] = useState(false);

  const handleSaveScore = async () => {
    const us  = parseInt(ourScoreInput, 10);
    const opp = parseInt(oppScoreInput, 10);
    if (isNaN(us) || isNaN(opp) || us < 0 || opp < 0) return;
    setSavingScore(true);
    try {
      await correctSetScore(set.id, us, opp);
      onClose();
    } finally {
      setSavingScore(false);
    }
  };

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

        {fixingScore ? (
          <>
            <div>
              <h2 className="text-lg font-bold text-white">Fix Score — Set {set.set_number}</h2>
              <p className="text-sm text-slate-400 mt-1">
                Just correct the final score. Stats and lineup for this set are left alone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center gap-1">
                <label className="text-xs text-slate-500 uppercase tracking-wide">Us</label>
                <input
                  type="number" min="0" inputMode="numeric"
                  value={ourScoreInput}
                  onChange={(e) => setOurScoreInput(e.target.value)}
                  className="w-20 text-center text-2xl font-bold font-mono bg-slate-800 border border-slate-600 rounded-lg py-2 text-white"
                />
              </div>
              <span className="text-slate-500 text-xl mt-5">–</span>
              <div className="flex flex-col items-center gap-1">
                <label className="text-xs text-slate-500 uppercase tracking-wide">Them</label>
                <input
                  type="number" min="0" inputMode="numeric"
                  value={oppScoreInput}
                  onChange={(e) => setOppScoreInput(e.target.value)}
                  className="w-20 text-center text-2xl font-bold font-mono bg-slate-800 border border-slate-600 rounded-lg py-2 text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <button
                disabled={savingScore}
                onClick={handleSaveScore}
                className="w-full py-3 px-4 bg-primary hover:brightness-110 text-white font-bold rounded-xl text-sm tracking-wide disabled:opacity-50"
              >
                {savingScore ? 'Saving…' : 'Save Score'}
              </button>
              <button
                disabled={savingScore}
                onClick={() => setFixingScore(false)}
                className="w-full py-2 text-sm text-slate-500 hover:text-slate-300 disabled:opacity-50"
              >
                Back
              </button>
            </div>
          </>
        ) : !confirmDel ? (
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
                onClick={() => setFixingScore(true)}
                className="w-full py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl text-sm tracking-wide disabled:opacity-50"
              >
                Fix Score Only
                <span className="block text-xs font-normal text-slate-400 mt-0.5">
                  Just correct the final score (e.g. it ended 24, not 25) — no stats touched
                </span>
              </button>

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
