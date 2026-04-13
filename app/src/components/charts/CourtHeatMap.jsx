import { useState, useMemo } from 'react';
import clsx from 'clsx';

// Zone layout:
//   [1][6][5]  ← back row (top)
//   [2][3][4]  ← front row (near net, bottom)
//
// SVG: top = back, bottom = net side

const ZONE_GRID = [
  [1, 6, 5],
  [2, 3, 4],
];

const TOGGLE_OPTIONS = [
  { key: 'serve_ace', label: 'Serve Aces', action: 'serve', result: 'ace' },
];

function zoneCounts(contacts, action, result) {
  const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const c of contacts) {
    if (c.action === action && c.result === result && c.zone != null) {
      counts[c.zone] = (counts[c.zone] ?? 0) + 1;
    }
  }
  return counts;
}

// Map count → orange opacity 0–1, log scale
function countToOpacity(count, max) {
  if (!max || !count) return 0;
  return 0.1 + 0.85 * (Math.log1p(count) / Math.log1p(max));
}

const W = 270;
const COURT_H = 180;
const NET_ZONE = 16;
const H = COURT_H + NET_ZONE;
const COL_W = W / 3;
const ROW_H = COURT_H / 2;

export function CourtHeatMap({ contacts = [] }) {
  const [activeKey, setActiveKey] = useState('serve_ace');

  const option = TOGGLE_OPTIONS.find(o => o.key === activeKey);

  const counts = useMemo(
    () => zoneCounts(contacts, option.action, option.result),
    [contacts, activeKey]
  );

  const max = Math.max(...Object.values(counts));

  return (
    <div className="space-y-3">
      {/* Toggle buttons */}
      <div className="flex flex-wrap gap-2">
        {TOGGLE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setActiveKey(opt.key)}
            className={clsx(
              'px-3 py-1 rounded-full text-xs font-medium transition-colors',
              activeKey === opt.key
                ? 'bg-primary text-white'
                : 'bg-surface text-slate-400 hover:text-white'
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* SVG court */}
      <div className="flex justify-center">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width={W}
          height={H}
          className="rounded overflow-hidden"
          style={{ maxWidth: '100%' }}
        >
          {/* Background */}
          <rect width={W} height={H} fill="#0f172a" />

          {/* Zone cells */}
          {ZONE_GRID.map((row, ri) =>
            row.map((zone, ci) => {
              const x = ci * COL_W;
              const y = ri * ROW_H;
              const opacity = countToOpacity(counts[zone], max);
              return (
                <g key={zone}>
                  <rect
                    x={x}
                    y={y}
                    width={COL_W}
                    height={ROW_H}
                    fill={`rgba(249,115,22,${opacity})`}
                    stroke="#1e293b"
                    strokeWidth={1}
                  />
                  <text
                    x={x + COL_W / 2}
                    y={y + ROW_H / 2 - 8}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="rgba(255,255,255,0.3)"
                    fontSize={11}
                  >
                    Z{zone}
                  </text>
                  <text
                    x={x + COL_W / 2}
                    y={y + ROW_H / 2 + 10}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={opacity > 0.4 ? '#fff' : '#94a3b8'}
                    fontSize={18}
                    fontWeight="bold"
                  >
                    {counts[zone] || 0}
                  </text>
                </g>
              );
            })
          )}

          {/* Net line */}
          <line x1={0} y1={COURT_H} x2={W} y2={COURT_H} stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" opacity={0.6} />

          {/* Net label */}
          <text x={W - 6} y={COURT_H + 11} textAnchor="end" fill="#f97316" fontSize={9} opacity={0.7}>NET</text>
        </svg>
      </div>

      <p className="text-xs text-slate-500 text-center">
        {option.label} by zone — darker = more frequent
      </p>
    </div>
  );
}
