import { useMemo, useState } from 'react';
import { fmtHitting } from '../../stats/formatters';
import { VIEW_W, VIEW_H, MARGIN, COURT_LEN, COURT_WID, courtToView, shotContacts, killsOffSetter, landingZone, SHOT_COLORS, useShotFlip } from '../../utils/attackShot';

// Sideways court (our side left, theirs right) with one line per attack:
// from where it was hit to where it landed. Kill = green, error = red,
// kept in play = gray. `shots` = attack contacts with from_x/from_y.
// `children` lets the live pop-up draw its own markers on the same court.
// Opponent zones in court fractions (see landingZone in utils/attackShot.js):
// from our side, zone 1 is their back row on our left (where their server
// stands), then counter-clockwise 2 → 3 → 4 across the front, 5 → 6 back.
const FRONT = 0.75; // front and back zones are equal halves of their side
const ZONE_CELLS = [
  { zone: 1, x0: FRONT, x1: 1,     y0: 0,     y1: 1 / 3 },
  { zone: 2, x0: 0.5,   x1: FRONT, y0: 0,     y1: 1 / 3 },
  { zone: 3, x0: 0.5,   x1: FRONT, y0: 1 / 3, y1: 2 / 3 },
  { zone: 4, x0: 0.5,   x1: FRONT, y0: 2 / 3, y1: 1 },
  { zone: 5, x0: FRONT, x1: 1,     y0: 2 / 3, y1: 1 },
  { zone: 6, x0: FRONT, x1: 1,     y0: 1 / 3, y1: 2 / 3 },
];

// Result filter pills shared by the shot chart boxes.
const SHOT_RESULT_FILTERS = [['all', 'ALL'], ['kill', 'KILLS'], ['error', 'ERRORS'], ['attempt', 'IN PLAY']];
function filterShotsByResult(shots, result) {
  if (result === 'all') return shots;
  if (result === 'kill' || result === 'error') return shots.filter((c) => c.result === result);
  return shots.filter((c) => c.result !== 'kill' && c.result !== 'error');
}
const shotChip = (active) => `px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${active ? 'bg-primary text-white' : 'bg-slate-800 text-slate-300'}`;
function ResultPills({ value, onChange }) {
  return (
    <div className="flex justify-center gap-1.5 flex-wrap">
      {SHOT_RESULT_FILTERS.map(([v, l]) => (
        <button key={v} className={shotChip(value === v)} onClick={() => onChange(v)}>{l}</button>
      ))}
    </div>
  );
}

// `overlay` is drawn on top without being turned by FLIP (for upright text).
// `zoneShots` (optional) = shots used for the per-zone kill count / kill %
// printed in each opponent zone (kept separate so a result filter doesn't
// skew the %). `zonePct` = false shows kill counts only (e.g. kills off sets).
// `sideLabelGap` = how far below the court US / THEM sit (court meters).
export function AttackShotChart({ shots = [], showLegend = true, flipped = false, children, overlay, className = '', zoneShots = null, zonePct = true, sideLabelGap = 1.8, sideLabelSize = 0.7 }) {
  const L = MARGIN, T = MARGIN, R = MARGIN + COURT_LEN, B = MARGIN + COURT_WID, NX = MARGIN + COURT_LEN / 2;
  const legendShots = zoneShots ?? shots;
  const kills  = legendShots.filter((c) => c.result === 'kill').length;
  const errors = legendShots.filter((c) => c.result === 'error').length;
  const zoneTally = {};
  if (zoneShots) {
    for (const c of zoneShots) {
      const z = c.zone ?? landingZone(c.court_x, c.court_y);
      if (!z) continue;
      zoneTally[z] ??= { n: 0, k: 0, e: 0 };
      zoneTally[z].n++;
      if (c.result === 'kill') zoneTally[z].k++;
      else if (c.result === 'error') zoneTally[z].e++;
    }
  }
  return (
    <div className={className}>
      {/* Per-zone kills / kill % / hitting % (attacks that landed in that zone),
          listed above the court so they're easy to read. */}
      {zoneShots && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 mb-1.5">
          {[1, 2, 3, 4, 5, 6].map((z) => {
            const t = zoneTally[z];
            return (
              <div key={z} className="bg-slate-800/70 rounded-md px-1 py-1 text-center leading-tight">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Zone {z}</div>
                <div className="text-sm font-bold text-white tabular-nums">{t ? t.k : 0} K</div>
                {zonePct && (
                  <div className="text-[11px] font-semibold tabular-nums">
                    <span style={{ color: SHOT_COLORS.kill }}>{t ? `${Math.round((t.k / t.n) * 100)}%` : '—'}</span>
                    <span className="text-slate-300 ml-1">{t ? fmtHitting((t.k - t.e) / t.n) : '—'}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} style={{ width: '100%', display: 'block' }}>
        <rect width={VIEW_W} height={VIEW_H} fill="#0b1220" />
        <rect x={L} y={T} width={COURT_LEN} height={COURT_WID} fill="#0f172a" stroke="#ffffff" strokeWidth={0.08} />
        {/* attack lines (3 m from net) */}
        <line x1={NX - 3} y1={T} x2={NX - 3} y2={B} stroke="#ffffff" strokeWidth={0.06} />
        <line x1={NX + 3} y1={T} x2={NX + 3} y2={B} stroke="#ffffff" strokeWidth={0.06} />
        <text x={L + COURT_LEN / 4} y={B + sideLabelGap} textAnchor="middle" fill="#64748b" fontSize={sideLabelSize} fontWeight="bold">{flipped ? 'THEM' : 'US'}</text>
        <text x={R - COURT_LEN / 4} y={B + sideLabelGap} textAnchor="middle" fill="#64748b" fontSize={sideLabelSize} fontWeight="bold">{flipped ? 'US' : 'THEM'}</text>
        {/* Flipped = whole court turned around so our side is on the right */}
        <g transform={flipped ? `rotate(180 ${VIEW_W / 2} ${VIEW_H / 2})` : undefined}>
        {/* Opponent court split into six equal zones: 3 lanes × front/back halves */}
        <line x1={MARGIN + COURT_LEN * 0.75} y1={T} x2={MARGIN + COURT_LEN * 0.75} y2={B} stroke="#334155" strokeOpacity={0.6} strokeWidth={0.03} strokeDasharray="0.3 0.25" />
        <line x1={NX} y1={T + COURT_WID / 3}     x2={R} y2={T + COURT_WID / 3}     stroke="#334155" strokeOpacity={0.6} strokeWidth={0.03} strokeDasharray="0.3 0.25" />
        <line x1={NX} y1={T + COURT_WID * 2 / 3} x2={R} y2={T + COURT_WID * 2 / 3} stroke="#334155" strokeOpacity={0.6} strokeWidth={0.03} strokeDasharray="0.3 0.25" />

        {/* net — drawn under the shot lines so shots cross over it */}
        <line x1={NX} y1={T - 0.6} x2={NX} y2={B + 0.6} stroke="#e8530b" strokeOpacity={0.6} strokeWidth={0.1} />
        {shots.map((c) => {
          const color = SHOT_COLORS[c.result] ?? SHOT_COLORS.attempt;
          const a = courtToView(c.from_x, c.from_y);
          const hasEnd = c.court_x != null && c.court_y != null;
          const b = hasEnd ? courtToView(c.court_x, c.court_y) : null;
          return (
            <g key={c.id ?? `${c.from_x}-${c.from_y}`} opacity={0.85}>
              {b && <line x1={a.vx} y1={a.vy} x2={b.vx} y2={b.vy} stroke={color} strokeWidth={0.035} />}
              <circle cx={a.vx} cy={a.vy} r={0.09} fill={color} />
              {b && (c.result === 'kill'
                ? <circle cx={b.vx} cy={b.vy} r={0.15} fill="none" stroke={color} strokeWidth={0.04} />
                : <path d={`M${b.vx - 0.115},${b.vy - 0.115} L${b.vx + 0.115},${b.vy + 0.115} M${b.vx + 0.115},${b.vy - 0.115} L${b.vx - 0.115},${b.vy + 0.115}`} stroke={color} strokeWidth={0.04} />)}
            </g>
          );
        })}
        {children}
        </g>
        {/* Zone numbers — drawn outside the turned group so they stay upright,
            tucked into each zone's top-right corner as seen on screen. */}
        {ZONE_CELLS.map(({ zone, x0, x1, y0, y1 }) => {
          const pts = [[x0, y0], [x1, y1]].map(([x, y]) => {
            const { vx, vy } = courtToView(x, y);
            return flipped ? [VIEW_W - vx, VIEW_H - vy] : [vx, vy];
          });
          const right = Math.max(pts[0][0], pts[1][0]);
          const top   = Math.min(pts[0][1], pts[1][1]);
          return (
            <g key={zone} pointerEvents="none">
              <text x={right - 0.15} y={top + 0.35} textAnchor="end" fill="#ffffff" fontSize={0.25} fontWeight="bold">{zone}</text>
            </g>
          );
        })}
        {overlay}
      </svg>
      {showLegend && (
        <div className="flex justify-center gap-4 mt-1 text-[11px] font-semibold">
          <span style={{ color: SHOT_COLORS.kill }}>● Kill {kills}</span>
          <span style={{ color: SHOT_COLORS.error }}>● Error {errors}</span>
          <span style={{ color: SHOT_COLORS.attempt }}>● In play {shots.length - kills - errors}</span>
        </div>
      )}
    </div>
  );
}

// Chart + picker: HITTERS (each hitter's attacks) or SETTERS (kills off each
// setter's assists). `playerNames` = { [playerId]: label }.
export function ShotChartPanel({ contacts = [], playerNames = {}, className = '' }) {
  const [mode, setMode]   = useState('hitters');
  const [pick, setPick]   = useState(null); // playerId | null = everyone
  const [result, setResult] = useState('all');
  const allShots = useMemo(() => shotContacts(contacts), [contacts]);
  const [flipped, toggleFlip] = useShotFlip();

  const hitterIds = useMemo(() => [...new Set(allShots.map((c) => c.player_id))], [allShots]);
  const setterIds = useMemo(() => {
    const shotIds = new Set(allShots.map((c) => c.id));
    return [...new Set(contacts
      .filter((c) => c.action === 'set' && c.result === 'assist' && shotIds.has(c.kill_contact_id))
      .map((c) => c.player_id))];
  }, [contacts, allShots]);
  const ids = mode === 'hitters' ? hitterIds : setterIds;
  const activePick = ids.includes(pick) ? pick : null;

  const shots = useMemo(() => {
    if (mode === 'hitters') return activePick == null ? allShots : allShots.filter((c) => c.player_id === activePick);
    if (activePick != null) return killsOffSetter(contacts, activePick);
    return setterIds.flatMap((sid) => killsOffSetter(contacts, sid));
  }, [mode, activePick, allShots, contacts, setterIds]);

  if (!allShots.length) {
    return <p className={`text-center text-xs text-slate-500 py-6 ${className}`}>No shot locations recorded yet. They're added after each attack (Settings → Live Match → Attack Shot Chart).</p>;
  }
  const chip = (active) => `px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${active ? 'bg-primary text-white' : 'bg-slate-800 text-slate-300'}`;
  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-center gap-2">
        {[['hitters', 'HITTERS'], ['setters', 'SETTERS']].map(([v, l]) => (
          <button key={v} className={chip(mode === v)} onClick={() => { setMode(v); setPick(null); }}>{l}</button>
        ))}
        <button className={chip(flipped)} onClick={toggleFlip} title="Show our team on the other side">⇄ FLIP</button>
      </div>
      {mode === 'hitters' && <ResultPills value={result} onChange={setResult} />}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button className={chip(activePick == null)} onClick={() => setPick(null)}>All</button>
        {ids.map((id) => (
          <button key={id} className={chip(activePick === id)} onClick={() => setPick(id)}>{playerNames[id] ?? 'Player'}</button>
        ))}
      </div>
      {mode === 'setters' && !ids.length
        ? <p className="text-center text-xs text-slate-500 py-6">No kills with a recorded setter and shot location yet.</p>
        : <AttackShotChart shots={mode === 'hitters' ? filterShotsByResult(shots, result) : shots} zoneShots={shots} zonePct={mode === 'hitters'} flipped={flipped} />}
    </div>
  );
}

// One player's shot chart in a boxed card (player page). mode 'hitter' = their
// attacks; 'setter' = kills off their sets. Renders nothing with no shots.
export function PlayerShotChartBox({ contacts = [], playerId, mode = 'hitter', title = 'Shot Chart' }) {
  const [flipped, toggleFlip] = useShotFlip();
  const [result, setResult] = useState('all');
  const shots = useMemo(() => (mode === 'setter'
    ? killsOffSetter(contacts, playerId)
    : shotContacts(contacts).filter((c) => c.player_id === playerId)), [contacts, playerId, mode]);
  if (!shots.length) return null;
  const chip = (active) => `px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${active ? 'bg-primary text-white' : 'bg-slate-800 text-slate-300'}`;
  return (
    <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 space-y-2">
      <p className="text-xs font-black uppercase tracking-wider text-white text-center">{title}</p>
      <div className="flex justify-center">
        <button className={chip(flipped)} onClick={toggleFlip} title="Show our team on the other side">⇄ FLIP</button>
      </div>
      {mode !== 'setter' && <ResultPills value={result} onChange={setResult} />}
      <AttackShotChart shots={mode === 'setter' ? shots : filterShotsByResult(shots, result)} zoneShots={shots} zonePct={mode !== 'setter'} flipped={flipped} />
    </div>
  );
}
