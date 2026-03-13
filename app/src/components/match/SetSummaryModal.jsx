import { memo } from 'react';
import { useMatchStore } from '../../store/matchStore';
import { SIDE } from '../../constants';

export const SetSummaryModal = memo(function SetSummaryModal({ winner, teamName, opponentName, onContinue }) {
  const ourScore  = useMatchStore((s) => s.ourScore);
  const oppScore  = useMatchStore((s) => s.oppScore);
  const setNumber = useMatchStore((s) => s.setNumber);

  const weWon = winner === SIDE.US;

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/96 flex flex-col items-center justify-center px-4">
      <div className="animate-set-summary-in w-full max-w-sm flex flex-col gap-6">

        {/* Score */}
        <div className="text-center">
          <div className={`text-[10px] font-bold uppercase tracking-widest mb-1 ${weWon ? 'text-emerald-500' : 'text-red-500'}`}>
            {weWon ? 'Set Won' : 'Set Lost'}
          </div>
          <div className="text-5xl font-black tabular-nums tracking-tight">
            <span className={weWon ? 'text-orange-400' : 'text-white'}>{ourScore}</span>
            <span className="text-slate-500 mx-3">–</span>
            <span className={!weWon ? 'text-red-400' : 'text-slate-400'}>{oppScore}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-2 uppercase tracking-wide font-semibold">
            {teamName || 'HOME'} vs {opponentName || 'AWAY'} · Set {setNumber}
          </div>
        </div>

        {/* Continue */}
        <button
          onPointerDown={(e) => { e.preventDefault(); onContinue(); }}
          className="w-full py-3 bg-primary hover:brightness-110 text-white font-bold text-sm tracking-widest uppercase rounded-xl active:brightness-75 select-none"
        >
          Start Next Set →
        </button>

      </div>
    </div>
  );
});
