// Tier thresholds. Each tier's ceiling ends in .99 (or .49) and the next tier's
// floor is the clean round number right above it — no gaps, no overlap:
//   NEG    < 0
//   BENCH  0.00 – 0.99
//   LOW    1.00 – 1.49
//   AVG    1.50 – 2.99
//   GOOD   3.00 – 4.49
//   GREAT  4.50 – 6.99
//   ELITE  7.00+
export const VER_TIERS = [
  { min: 7.00,      label: 'ELITE',  cls: 'bg-cyan-500/20   text-cyan-400   border-cyan-500/40'   },
  { min: 4.50,      label: 'GREAT',  cls: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  { min: 3.00,      label: 'GOOD',   cls: 'bg-green-500/20  text-green-400  border-green-500/40'  },
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

// wVER tiers — same tier names as VER, but scaled up since wVER = VER × position
// multiplier (2.70–5.00×), so the cutoffs run much higher than raw VER's:
//   NEG    < 0
//   BENCH  0.01 – 1.99
//   LOW    2.00 – 4.99
//   AVG    5.00 – 8.99
//   GOOD   9.00 – 12.99
//   GREAT  13.00 – 19.99
//   ELITE  20.00+
export const WVER_TIERS = [
  { min: 20.00,     label: 'ELITE',  cls: 'bg-cyan-500/20   text-cyan-400   border-cyan-500/40'   },
  { min: 13.00,     label: 'GREAT',  cls: 'bg-violet-500/20 text-violet-300 border-violet-500/40' },
  { min: 9.00,      label: 'GOOD',   cls: 'bg-green-500/20  text-green-400  border-green-500/40'  },
  { min: 5.00,      label: 'AVG',    cls: 'bg-slate-500/20  text-white      border-slate-500/40'  },
  { min: 2.00,      label: 'LOW',    cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  { min: 0.01,      label: 'BENCH',  cls: 'bg-red-500/20    text-slate-300  border-red-500/40'    },
  { min: -Infinity, label: 'NEG',    cls: 'bg-black         text-red-500    border-red-900'        },
];

export function WVERBadge({ ver }) {
  if (ver === null || ver === undefined) return <span className="text-slate-500">—</span>;
  const tier = WVER_TIERS.find(t => ver >= t.min);
  return (
    <span className="inline-flex items-center gap-1.5 justify-end">
      <span className="tabular-nums">{(ver >= 0 ? '+' : '') + ver.toFixed(2)}</span>
      <span className={`text-[9px] font-bold px-1 py-px rounded border ${tier.cls}`}>{tier.label}</span>
    </span>
  );
}
