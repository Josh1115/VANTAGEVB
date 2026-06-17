import { memo, useState } from 'react';
import { useMatchStore } from '../../store/matchStore';
import { SIDE } from '../../constants';
import { LiveStatsModal } from '../stats/LiveStatsModal';

export const SetSummaryModal = memo(function SetSummaryModal({ winner, teamName, opponentName, onContinue, onClose }) {
  const ourScore  = useMatchStore((s) => s.ourScore);
  const oppScore  = useMatchStore((s) => s.oppScore);
  const setNumber = useMatchStore((s) => s.setNumber);
  const [showStats, setShowStats] = useState(false);

  const weWon = winner === SIDE.US;

  return (
    <>
      <div className={`fixed inset-0 z-[70] bg-black/80 flex flex-col items-center justify-center px-4 ${showStats ? 'hidden' : ''}`}>
        <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl px-8 py-8 flex flex-col gap-5 relative">
          {onClose && (
            <button
              onPointerDown={(e) => { e.preventDefault(); onClose(); }}
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-slate-500 hover:text-slate-300 text-xl leading-none select-none"
              aria-label="Dismiss"
            >×</button>
          )}

          {/* Win / Loss banner */}
          <div className="text-center">
            <div className={`text-xs font-black uppercase tracking-[0.25em] mb-1 ${weWon ? 'text-emerald-400' : 'text-red-400'}`}>
              {weWon ? '✓ Set Won' : '✗ Set Lost'}
            </div>
            <div className="text-6xl font-black tabular-nums tracking-tight leading-none">
              <span className={weWon ? 'text-primary' : 'text-white'}>{ourScore}</span>
              <span className="text-slate-600 mx-3">–</span>
              <span className={!weWon ? 'text-red-400' : 'text-slate-400'}>{oppScore}</span>
            </div>
            <div className="text-[11px] text-slate-500 mt-2 uppercase tracking-widest font-semibold">
              {teamName || 'US'} vs {opponentName || 'THEM'} · Set {setNumber}
            </div>
          </div>

          {/* View Stats */}
          <button
            onPointerDown={(e) => { e.preventDefault(); setShowStats(true); }}
            className="w-full py-3 bg-slate-700 hover:bg-slate-600 border border-slate-500 text-slate-200 font-bold text-sm tracking-widest uppercase rounded-xl active:brightness-75 select-none"
          >
            View Set Stats
          </button>

          {/* Continue */}
          <button
            onPointerDown={(e) => { e.preventDefault(); onContinue(); }}
            className="w-full py-3 bg-primary hover:brightness-110 text-white font-bold text-sm tracking-widest uppercase rounded-xl active:brightness-75 select-none"
          >
            Start Set {setNumber + 1} →
          </button>

        </div>
      </div>

      <LiveStatsModal
        open={showStats}
        onClose={() => setShowStats(false)}
        teamName={teamName}
        opponentName={opponentName}
      />
    </>
  );
});
