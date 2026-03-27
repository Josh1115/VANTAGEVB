const VER_TIERS = [
  { min: 28,        label: 'ELITE+', cls: 'bg-orange-500/20 text-orange-400 border-orange-500/40' },
  { min: 22,        label: 'ELITE',  cls: 'bg-cyan-500/20   text-cyan-400   border-cyan-500/40'   },
  { min: 15,        label: 'GOOD',   cls: 'bg-green-500/20  text-green-400  border-green-500/40'  },
  { min: 10,        label: 'AVG',    cls: 'bg-slate-500/20  text-white      border-slate-500/40'  },
  { min: 5,         label: 'LOW',    cls: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40' },
  { min: 0,         label: 'BENCH',  cls: 'bg-slate-700/40  text-slate-400  border-slate-700'     },
  { min: -Infinity, label: 'NEG',    cls: 'bg-red-500/20    text-red-400    border-red-500/40'    },
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
