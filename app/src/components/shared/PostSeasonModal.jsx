import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/schema';

export function PostSeasonModal({ teamId, year, onClose }) {
  const navigate = useNavigate();
  const [archived,          setArchived]          = useState(false);
  const [archiving,         setArchiving]          = useState(false);
  const [practiceArchived,  setPracticeArchived]   = useState(false);
  const [archivingPractice, setArchivingPractice]  = useState(false);

  const activePlayers = useLiveQuery(
    () => db.players.where('team_id').equals(teamId).filter(p => p.is_active).toArray(),
    [teamId]
  );

  const historyEntry = useLiveQuery(
    () => db.season_history.where('team_id').equals(teamId)
      .filter(h => String(h.year) === String(year))
      .first(),
    [teamId, year]
  );

  const activePracticeSessions = useLiveQuery(
    () => db.practice_sessions.where('team_id').equals(teamId)
      .filter(s => !s.archived)
      .toArray(),
    [teamId]
  );

  const activeCount    = activePlayers?.length ?? 0;
  const practiceCount  = activePracticeSessions?.length ?? 0;
  // Incomplete = no entry, or entry exists but has neither coach nor W/L recorded
  const historyIncomplete = !historyEntry || (!historyEntry.head_coach && historyEntry.wins == null);

  async function handleArchive() {
    setArchiving(true);
    try {
      const players = await db.players
        .where('team_id').equals(teamId)
        .filter(p => p.is_active)
        .toArray();
      await Promise.all(players.map(p => db.players.update(p.id, { is_active: false })));
      setArchived(true);
    } finally {
      setArchiving(false);
    }
  }

  async function handleArchivePractice() {
    setArchivingPractice(true);
    try {
      const sessions = await db.practice_sessions.where('team_id').equals(teamId)
        .filter(s => !s.archived).toArray();
      await Promise.all(sessions.map(s => db.practice_sessions.update(s.id, { archived: true })));
      setPracticeArchived(true);
    } finally {
      setArchivingPractice(false);
    }
  }

  const allDone = (activeCount === 0 || archived) && !historyIncomplete && (practiceCount === 0 || practiceArchived);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl p-5 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h2 className="text-base font-bold text-slate-100">Season Complete</h2>
          <p className="text-sm text-slate-400 mt-0.5">
            {allDone ? 'All wrapped up.' : 'A couple things to wrap up:'}
          </p>
        </div>

        {!allDone && (
          <div className="space-y-2">
            {/* Archive Roster */}
            {activeCount > 0 && !archived && (
              <div className="bg-slate-800 rounded-xl px-4 py-3 space-y-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Archive Roster</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Move {activeCount} active player{activeCount !== 1 ? 's' : ''} to inactive.
                    Players and all their stats are preserved.
                  </p>
                </div>
                <button
                  onClick={handleArchive}
                  disabled={archiving}
                  className="w-full py-2 rounded-lg bg-slate-700 text-slate-200 text-sm font-semibold hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  {archiving ? 'Archiving…' : `Archive ${activeCount} Players`}
                </button>
              </div>
            )}

            {/* Archived confirmation inline */}
            {archived && (
              <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <p className="text-sm text-slate-300">{activeCount} players archived</p>
              </div>
            )}

            {/* Season Details */}
            {historyIncomplete && (
              <div className="bg-slate-800 rounded-xl px-4 py-3 space-y-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Add Season Details</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Log the final W/L record, coach, rankings, and playoff finish in History.
                  </p>
                </div>
                <button
                  onClick={() => { navigate('/history'); onClose(); }}
                  className="w-full py-2 rounded-lg bg-slate-700 text-slate-200 text-sm font-semibold hover:bg-slate-600 transition-colors"
                >
                  Go to History →
                </button>
              </div>
            )}

            {/* Archive Practice Sessions */}
            {practiceCount > 0 && !practiceArchived && (
              <div className="bg-slate-800 rounded-xl px-4 py-3 space-y-2.5">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Archive Practice Sessions</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Archive {practiceCount} practice session{practiceCount !== 1 ? 's' : ''} from this season.
                    Sessions stay visible in the Practice tab.
                  </p>
                </div>
                <button
                  onClick={handleArchivePractice}
                  disabled={archivingPractice}
                  className="w-full py-2 rounded-lg bg-slate-700 text-slate-200 text-sm font-semibold hover:bg-slate-600 transition-colors disabled:opacity-50"
                >
                  {archivingPractice ? 'Archiving…' : `Archive ${practiceCount} Session${practiceCount !== 1 ? 's' : ''}`}
                </button>
              </div>
            )}

            {/* Practice archived confirmation */}
            {practiceArchived && (
              <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-2">
                <span className="text-emerald-400 font-bold">✓</span>
                <p className="text-sm text-slate-300">Practice sessions archived</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold active:scale-95"
        >
          Done
        </button>
      </div>
    </div>
  );
}
