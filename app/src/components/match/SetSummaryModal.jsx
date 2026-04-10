import { memo, useMemo } from 'react';
import { useMatchStore } from '../../store/matchStore';
import { computeTeamStats, computeRotationStats } from '../../stats/engine';
import { fmtHitting, fmtPct } from '../../stats/formatters';
import { SIDE } from '../../constants';

export const SetSummaryModal = memo(function SetSummaryModal({ winner, teamName, opponentName, onContinue }) {
  const ourScore          = useMatchStore((s) => s.ourScore);
  const oppScore          = useMatchStore((s) => s.oppScore);
  const setNumber         = useMatchStore((s) => s.setNumber);
  const committedContacts = useMatchStore((s) => s.committedContacts);
  const committedRallies  = useMatchStore((s) => s.committedRallies);
  const currentSetId      = useMatchStore((s) => s.currentSetId);

  const weWon = winner === SIDE.US;

  const setContacts = useMemo(
    () => committedContacts.filter((c) => c.set_id === currentSetId),
    [committedContacts, currentSetId]
  );
  const setRallies = useMemo(
    () => committedRallies.filter((r) => r.set_id === currentSetId),
    [committedRallies, currentSetId]
  );

  const ts = useMemo(() => computeTeamStats(setContacts), [setContacts]);
  const rs = useMemo(() => computeRotationStats(setRallies), [setRallies]);

  const stats = [
    { label: 'HIT%',  val: fmtHitting(ts.hit_pct),      good: (ts.hit_pct ?? 0) >= 0.25,  bad: (ts.hit_pct ?? 0) < 0.10 },
    { label: 'SO%',   val: fmtPct(rs.so_pct),            good: (rs.so_pct ?? 0) >= 0.55,   bad: (rs.so_pct ?? 0) < 0.40  },
    { label: 'ACE',   val: ts.ace ?? 0,                  good: (ts.ace ?? 0) >= 3,          bad: false                     },
    { label: 'SE',    val: ts.se ?? 0,                   good: false,                        bad: (ts.se ?? 0) >= 4         },
    { label: 'TA',    val: ts.ta ?? 0,                   good: false,                        bad: false                     },
    { label: 'K',     val: ts.k ?? 0,                    good: (ts.k ?? 0) >= 10,           bad: false                     },
    { label: 'AE',    val: ts.ae ?? 0,                   good: false,                        bad: (ts.ae ?? 0) >= 5         },
    { label: 'DIG',   val: ts.dig ?? 0,                  good: false,                        bad: false                     },
  ];

  return (
    <div className="fixed inset-0 z-[70] bg-slate-900/97 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm flex flex-col gap-5">

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

        {/* Stat grid */}
        <div className="grid grid-cols-4 gap-2">
          {stats.map(({ label, val, good, bad }) => (
            <div key={label} className="bg-slate-800 rounded-xl p-2.5 text-center">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{label}</div>
              <div className={`text-lg font-black tabular-nums leading-none ${
                good ? 'text-emerald-400' : bad ? 'text-red-400' : 'text-slate-200'
              }`}>
                {val}
              </div>
            </div>
          ))}
        </div>

        {/* Rotation spotlight — best and worst this set */}
        {rs.rotations && Object.keys(rs.rotations).length > 0 && (() => {
          const entries = Object.entries(rs.rotations)
            .filter(([, r]) => (r.so_opp ?? 0) >= 2)
            .map(([n, r]) => ({ n, pct: r.so_pct ?? 0 }));
          if (!entries.length) return null;
          const best  = entries.reduce((a, b) => b.pct > a.pct ? b : a);
          const worst = entries.reduce((a, b) => b.pct < a.pct ? b : a);
          if (best.n === worst.n) return null;
          return (
            <div className="flex gap-2">
              <div className="flex-1 bg-emerald-900/30 border border-emerald-700/30 rounded-xl p-2.5 text-center">
                <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 mb-0.5">Best Rotation</div>
                <div className="text-lg font-black text-emerald-400">R{best.n}</div>
                <div className="text-xs text-emerald-600">{Math.round(best.pct * 100)}% SO</div>
              </div>
              <div className="flex-1 bg-red-900/30 border border-red-700/30 rounded-xl p-2.5 text-center">
                <div className="text-[10px] font-bold uppercase tracking-widest text-red-600 mb-0.5">Worst Rotation</div>
                <div className="text-lg font-black text-red-400">R{worst.n}</div>
                <div className="text-xs text-red-600">{Math.round(worst.pct * 100)}% SO</div>
              </div>
            </div>
          );
        })()}

        {/* Continue */}
        <button
          onPointerDown={(e) => { e.preventDefault(); onContinue(); }}
          className="w-full py-3 bg-primary hover:brightness-110 text-white font-bold text-sm tracking-widest uppercase rounded-xl active:brightness-75 select-none"
        >
          Start Set {setNumber + 1} →
        </button>

      </div>
    </div>
  );
});
