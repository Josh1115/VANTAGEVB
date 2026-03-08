import { useState, useMemo } from 'react';
import clsx from 'clsx';

// Zone layout (FIVB, opponent court, viewed from our bench):
//   [4][3][2]  ← front row (near net)
//   [5][6][1]  ← back row
//
// SVG: top = net side, bottom = back

const ZONE_GRID = [
  [4, 3, 2],
  [5, 6, 1],
];

const TOGGLE_OPTIONS = [
  { key: 'attack_kill',   label: 'Attack Kills',   action: 'attack',           result: 'kill'    },
  { key: 'attack_error',  label: 'Attack Errors',  action: 'attack',           result: 'error'   },
  { key: 'serve_ace',     label: 'Serve Aces',     action: 'serve',            result: 'ace'     },
  { key: 'serve_error',   label: 'Serve Errors',   action: 'serve',            result: 'error'   },
  { key: 'dig',           label: 'Digs',           action: 'dig',              result: 'success' },
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
const H = 180;
const COL_W = W / 3;
const ROW_H = H / 2;

export function CourtHeatMap({ contacts = [] }) {
  const [activeKey, setActiveKey] = useState('attack_kill');

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
          <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke="#f97316" strokeWidth={2} strokeDasharray="6 3" opacity={0.6} />

          {/* Net label */}
          <text x={W - 6} y={H / 2 - 4} textAnchor="end" fill="#f97316" fontSize={9} opacity={0.7}>NET</text>
        </svg>
      </div>

      <p className="text-xs text-slate-500 text-center">
        {option.label} by zone — darker = more frequent
      </p>
    </div>
  );
}
