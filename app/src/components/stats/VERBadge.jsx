// Tier thresholds. Each tier's ceiling ends in .99 and the next tier's floor
// is the clean round number right above it — no gaps, no overlap:
//   NEG    < 0
//   BENCH  0.00 – 0.99
//   LOW    1.00 – 1.49
//   AVG    1.50 – 2.49
//   GOOD   2.50 – 3.99
//   ELITE  4.00 – 5.99
//   ELITE+ 6.00+
export const VER_TIERS = [
  { min: 6.00,      label: 'ELITE+', cls: 'bg-cyan-500/20   text-cyan-400   border-cyan-500/40'   },
  { min: 4.00,      label: 'ELITE',  cls: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  { min: 2.50,      label: 'GOOD',   cls: 'bg-green-500/20  text-green-400  border-green-500/40'  },
  { min: 1.50,      label: 'AVG',    cls: 'bg-slate-500/20  text-white      border-slate-500/40'  },
  { min: 1.00,      label: 'LOW',    cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  { min: 0,         label: 'BENCH',  cls: 'bg-red-500/20    text-slate-300  border-red-500/40'    },
  { min: -Infinity, label: 'NEG',    cls: 'bg-black         text-red-500    border-red-900'        },
];

export function VERBadge({ ver }) {
  if (ver === null || ver === undefined) return <span className="text-slate-500">—</span>;
  const tier = VER_TIERS.find(t => ver >= t.min);
  return (
    <span className="inline-flex items-center gap-1.5 justify-end">
      <span className="tabular-nums">{(ver >= 0 ? '+' : '') + ver.toFixed(2)}</span>
      <span className={`text-[9px] font-bold px-1 py-px rounded border ${tier.cls}`}>{tier.label}</span>
    </span>
  );
}
