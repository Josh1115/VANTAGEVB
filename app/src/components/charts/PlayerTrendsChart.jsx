import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { fmtHitting, fmtPassRating, fmtPct } from '../../stats/formatters';

const STAT_OPTIONS = [
  { key: 'ver',     label: 'VER',   fmtY: v => v?.toFixed(1) ?? '',      fmtTip: v => v?.toFixed(2) ?? '—'  },
  { key: 'hit_pct', label: 'HIT%',  fmtY: v => v != null ? ((v >= 0 ? '+' : '') + (v * 100).toFixed(0) + '%') : '', fmtTip: fmtHitting, domain: [() => -1, () => 1] },
  { key: 'k_pct',   label: 'K%',    fmtY: v => v != null ? (v * 100).toFixed(0) + '%' : '', fmtTip: fmtPct,  domain: [0, () => 1] },
  { key: 'apr',     label: 'APR',   fmtY: v => v?.toFixed(1) ?? '',      fmtTip: fmtPassRating               },
  { key: 'kps',     label: 'K/S',   fmtY: v => v?.toFixed(1) ?? '',      fmtTip: v => v?.toFixed(2) ?? '—'  },
  { key: 'dips',    label: 'Dig/S', fmtY: v => v?.toFixed(1) ?? '',      fmtTip: v => v?.toFixed(2) ?? '—'  },
  { key: 'recs',    label: 'REC/S', fmtY: v => v?.toFixed(1) ?? '',      fmtTip: v => v?.toFixed(2) ?? '—'  },
  { key: 'si_pct',  label: 'S%',    fmtY: v => v != null ? (v * 100).toFixed(0) + '%' : '', fmtTip: fmtPct,  domain: [0, () => 1] },
  { key: 'ace_pct', label: 'ACE%',  fmtY: v => v != null ? (v * 100).toFixed(0) + '%' : '', fmtTip: fmtPct,  domain: [0, () => 1] },
];

// 14 perceptually distinct colors for dark backgrounds
const COLORS = [
  '#e8530b', '#3b82f6', '#22c55e', '#ef4444', '#a855f7',
  '#06b6d4', '#ec4899', '#eab308', '#14b8a6', '#f43f5e',
  '#8b5cf6', '#84cc16', '#0ea5e9', '#fb923c',
];

// Secondary differentiator: solid → dashed → dotted, cycling every 5 players
const DASHES = ['', '6 3', '2 4'];

const CHIP = 'px-3 py-1 rounded-full text-xs font-semibold transition-colors';
const chipClass = active =>
  active ? `${CHIP} bg-primary text-white` : `${CHIP} bg-surface text-slate-400 hover:text-white`;

export function PlayerTrendsChart({ trends, playerNames }) {
  const [statKey,    setStatKey]    = useState('ver');
  const [focusedPid, setFocusedPid] = useState(null);

  if (!trends?.matches.length || !Object.keys(trends.byPlayer).length) return null;

  const stat = STAT_OPTIONS.find(s => s.key === statKey);

  const data = trends.matches.map((m, i) => {
    const row = { name: m.opponentAbbr || m.opponentName || `M${i + 1}`, opponentName: m.opponentName };
    for (const [pid, entries] of Object.entries(trends.byPlayer)) {
      row[pid] = entries[i]?.[statKey] ?? null;
    }
    return row;
  });

  const playerIds = Object.keys(trends.byPlayer).filter(pid =>
    data.some(d => d[pid] != null)
  );

  if (!playerIds.length) {
    return (
      <p className="text-sm text-slate-500 text-center py-6">
        No data for this stat in the selected matches.
      </p>
    );
  }

  const colorOf = (i) => COLORS[i % COLORS.length];
  const dashOf  = (i) => DASHES[Math.floor(i / 5) % DASHES.length];

  const renderLegend = ({ payload }) => (
    <div className="mt-3">
      <div className="flex flex-wrap gap-x-4 gap-y-2 justify-center px-2">
        {payload.map((entry) => {
          const pid      = entry.value;
          const idx      = playerIds.indexOf(pid);
          const color    = colorOf(idx);
          const isFocused = focusedPid === pid;
          const isDimmed  = focusedPid !== null && !isFocused;
          return (
            <button
              key={pid}
              onClick={() => setFocusedPid(f => f === pid ? null : pid)}
              className={`flex items-center gap-1.5 transition-opacity select-none ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
            >
              <svg width="18" height="10" className="shrink-0">
                <line
                  x1="0" y1="5" x2="18" y2="5"
                  stroke={color}
                  strokeWidth={isFocused ? 3 : 2}
                  strokeDasharray={dashOf(idx) || undefined}
                />
                <circle cx="9" cy="5" r="3" fill={color} />
              </svg>
              <span className={`text-xs font-semibold ${isFocused ? 'text-white' : 'text-slate-400'}`}>
                {playerNames[pid] ?? `#${pid}`}
              </span>
            </button>
          );
        })}
      </div>
      <p className="text-center text-[10px] text-slate-600 mt-2 italic">
        Tap a name to highlight their trend
      </p>
    </div>
  );

  return (
    <>
      <div className="flex gap-1.5 flex-wrap mb-4">
        {STAT_OPTIONS.map(s => (
          <button key={s.key} onClick={() => { setStatKey(s.key); setFocusedPid(null); }} className={chipClass(statKey === s.key)}>
            {s.label}
          </button>
        ))}
      </div>

      <ResponsiveContainer width="100%" height={660}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 32 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            angle={-35}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tickFormatter={stat.fmtY}
            domain={stat.domain}
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            cursor={{ stroke: '#334155' }}
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
            labelStyle={{ color: '#f1f5f9', marginBottom: 4 }}
            labelFormatter={(label, payload) => {
              const opp = payload?.[0]?.payload?.opponentName;
              return opp ? `${label} vs ${opp}` : label;
            }}
            formatter={(val, _key, item) => [
              stat.fmtTip(val),
              playerNames[item.dataKey] ?? `#${item.dataKey}`,
            ]}
          />
          <Legend content={renderLegend} />
          {playerIds.map((pid, i) => {
            const color     = colorOf(i);
            const dash      = dashOf(i);
            const isFocused = focusedPid === pid;
            const isDimmed  = focusedPid !== null && !isFocused;
            return (
              <Line
                key={pid}
                dataKey={pid}
                stroke={color}
                strokeWidth={isFocused ? 3.5 : isDimmed ? 1 : 2}
                strokeOpacity={isDimmed ? 0.18 : 1}
                strokeDasharray={dash || undefined}
                dot={isDimmed ? false : { r: isFocused ? 4 : 3, fill: color }}
                activeDot={isDimmed ? false : { r: 5 }}
                connectNulls={false}
                animationBegin={i * 60}
                animationDuration={600}
                animationEasing="ease-out"
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}
