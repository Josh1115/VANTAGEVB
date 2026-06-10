import { useState } from 'react';

const SORT_OPTIONS = [
  { key: 'kills',   label: 'K'   },
  { key: 'killPct', label: 'K%'  },
  { key: 'aces',    label: 'ACE' },
  { key: 'apr',     label: 'APR' },
  { key: 'digs',    label: 'DIG' },
];

const fmt = (v, dec = 0) =>
  v == null ? '—' : dec > 0 ? (v * 100).toFixed(1) + '%' : String(v);

const fmtApr = (v) => v == null ? '—' : v.toFixed(2);

export function TeamRosterPanel({ players, selectedId, onSelect }) {
  const [sortKey, setSortKey] = useState('kills');

  const sorted = [...(players ?? [])].sort((a, b) => {
    const av = a.stats[sortKey] ?? -1;
    const bv = b.stats[sortKey] ?? -1;
    return bv - av;
  });

  return (
    <div className="bg-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
        <span className="text-sm font-semibold text-white">Team Roster</span>
        <div className="flex gap-1">
          {SORT_OPTIONS.map(o => (
            <button
              key={o.key}
              onClick={() => setSortKey(o.key)}
              className={`px-2 py-0.5 rounded text-xs font-bold transition-colors ${
                sortKey === o.key
                  ? 'bg-primary text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-slate-700/30">
        {/* Header row */}
        <div className="grid grid-cols-[2rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem] gap-x-2 px-4 py-1.5 text-xs text-slate-500 font-semibold uppercase">
          <span>#</span>
          <span>Player</span>
          <span className="text-center">K</span>
          <span className="text-center">ACE</span>
          <span className="text-center">APR</span>
          <span className="text-center">DIG</span>
        </div>

        {sorted.map(p => (
          <button
            key={p.id}
            onClick={() => onSelect?.(p.id)}
            className={`w-full grid grid-cols-[2rem_1fr_2.5rem_2.5rem_2.5rem_2.5rem] gap-x-2 px-4 py-2.5 text-left transition-colors ${
              selectedId === p.id
                ? 'bg-primary/15'
                : 'hover:bg-slate-700/40'
            }`}
          >
            <span className="text-xs text-slate-400 tabular-nums">{p.jersey}</span>
            <span className={`text-sm font-medium truncate ${selectedId === p.id ? 'text-primary' : 'text-white'}`}>
              {p.name}
            </span>
            <span className="text-xs tabular-nums text-slate-300 text-center">{fmt(p.stats.kills)}</span>
            <span className="text-xs tabular-nums text-slate-300 text-center">{fmt(p.stats.aces)}</span>
            <span className="text-xs tabular-nums text-slate-300 text-center">{fmtApr(p.stats.apr)}</span>
            <span className="text-xs tabular-nums text-slate-300 text-center">{fmt(p.stats.digs)}</span>
          </button>
        ))}

        {!sorted.length && (
          <div className="px-4 py-6 text-center text-sm text-slate-500">No players yet</div>
        )}
      </div>
    </div>
  );
}
