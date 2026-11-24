import { useState } from 'react';
import { fmtPct } from '../../stats/formatters';
import { SubToggle } from './SubToggle';

const RETICLE_ZONE_GRID = [[1, 6, 5], [2, 3, 4]];
const RW = 912, RH = 608;

// Normalize 'top' → 'topspin' so both the chip filter value ('top') and
// the stored DB value ('topspin') are handled correctly.
function normalizeServeType(st) {
  return st === 'top' ? 'topspin' : st;
}


/**
 * Individual player serve placement card.
 * player: a playerRow ({ id, name, sa, ace, si_pct, ... })
 * contacts: raw contact array (already filtered to the relevant scope)
 * playerJerseys: { [playerId]: jerseyNumber }
 */
export function PlayerServePlacementCard({ player, contacts, playerJerseys }) {
  const [serveType, setServeType] = useState('all');

  const jersey = playerJerseys?.[player.id] ?? '';
  const pid    = Number(player.id);
  const type   = normalizeServeType(serveType);

  const serves = contacts.filter(c =>
    c.action === 'serve' && !c.opponent_contact &&
    c.player_id === pid && c.court_x != null &&
    (type === 'all' || c.serve_type === type)
  );

  const zoneCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const c of serves) if (c.zone) zoneCounts[c.zone]++;

  return (
    <div className="mt-3 bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="font-bold text-white text-sm">
            {jersey ? `#${jersey} ` : ''}{player.name}
          </span>
          <span className="text-xs text-slate-400">
            {player.sa ?? 0} SA · {player.ace ?? 0} ACE · {fmtPct(player.si_pct)} SI%
          </span>
        </div>
        <SubToggle
          options={[['all', 'ALL'], ['float', 'FLOAT'], ['topspin', 'TOP SPIN']]}
          value={serveType}
          onChange={setServeType}
        />
      </div>

      {/* Court */}
      {serves.length === 0 ? (
        <p className="text-xs text-slate-500 text-center py-5">
          No serve placement data for this filter
        </p>
      ) : (
        <div className="px-3 pb-3">
          <div className="rounded-lg overflow-hidden" style={{ aspectRatio: `${RW} / ${RH}` }}>
            <svg viewBox={`0 0 ${RW} ${RH}`} style={{ width: '100%', height: '100%', display: 'block' }}>
              <rect width={RW} height={RH} fill="#0f172a" />

              {/* Zone cells with count overlay */}
              {RETICLE_ZONE_GRID.map((row, ri) =>
                row.map((zone, ci) => {
                  const x  = ci * (RW / 3);
                  const y  = ri * (RH / 2);
                  const ct = zoneCounts[zone] ?? 0;
                  return (
                    <g key={zone}>
                      <rect x={x} y={y} width={RW / 3} height={RH / 2}
                        fill="transparent" stroke="#334155" strokeWidth={1} />
                      <text x={x + RW / 6} y={y + RH / 4}
                        textAnchor="middle" dominantBaseline="middle"
                        fill="rgba(148,163,184,0.2)" fontSize={22} fontWeight="bold"
                      >{zone}</text>
                      {ct > 0 && (
                        <text x={x + RW / 3 - 10} y={y + 18}
                          textAnchor="end" dominantBaseline="middle"
                          fill="rgba(148,163,184,0.5)" fontSize={13} fontWeight="bold"
                        >×{ct}</text>
                      )}
                    </g>
                  );
                })
              )}

              {/* Net */}
              <line x1={0} y1={RH - 2} x2={RW} y2={RH - 2} stroke="#e8530b" strokeWidth={3} />
              <text x={RW / 2} y={RH - 14} textAnchor="middle" dominantBaseline="middle"
                fill="#e8530b" fontSize={18} fontWeight="bold" letterSpacing={4} opacity={0.75}
              >NET</text>

              {/* Reticles */}
              {serves.map((c) =>
                c.result === 'ace' ? (
                  <text key={c.id} x={c.court_x * RW} y={c.court_y * RH}
                    textAnchor="middle" dominantBaseline="middle"
                    fontSize={16} fill="#f59e0b"
                  >★</text>
                ) : (
                  <circle key={c.id} cx={c.court_x * RW} cy={c.court_y * RH}
                    r={7} fill="rgba(52,211,153,0.2)" stroke="#34d399" strokeWidth={2}
                  />
                )
              )}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Team-level serve placement court.
 * contacts: raw contact array
 * serveType: 'all' | 'float' | 'top' | 'topspin'
 */
// Team serve placement in a boxed card, with player pills (All + each server).
// playerNames = { [playerId]: label }.
export function ServeReticlePlot({ contacts, serveType, playerNames = {}, showPlayerPills = true }) {
  const [pick, setPick] = useState(null); // playerId | null = everyone
  // Own ALL/FLOAT/TOP pills; follows the page's serve-type toggle when that changes.
  const [chartType, setChartType] = useState(serveType ?? 'all');
  const [lastPropType, setLastPropType] = useState(serveType);
  if (serveType !== lastPropType) { setLastPropType(serveType); setChartType(serveType ?? 'all'); }
  const type = normalizeServeType(chartType);

  const allServes = contacts.filter(c => c.action === 'serve' && !c.opponent_contact && c.court_x != null);
  if (!allServes.length) return null;
  const teamServes = allServes.filter(c => type === 'all' || c.serve_type === type);

  const jerseyNum = (id) => parseInt(String(playerNames[id] ?? '').replace('#', ''), 10);
  const serverIds = [...new Set(teamServes.map(c => c.player_id))]
    .sort((a, b) => (jerseyNum(a) || 999) - (jerseyNum(b) || 999));
  const activePick = serverIds.includes(pick) ? pick : null;
  const serves = activePick == null ? teamServes : teamServes.filter(c => c.player_id === activePick);

  const zoneCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const c of serves) if (c.zone) zoneCounts[c.zone]++;

  const aces = serves.filter(c => c.result === 'ace').length;
  const ins  = serves.filter(c => c.result !== 'ace').length;
  const chip = (active) => `px-2.5 py-1 rounded-full text-[11px] font-bold whitespace-nowrap ${active ? 'bg-primary text-white' : 'bg-slate-800 text-slate-300'}`;

  return (
    <div className="bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 space-y-2">
      <p className="text-xs font-black uppercase tracking-wider text-white text-center">Serve Placement</p>
      <div className="flex justify-center gap-2">
        {[['all', 'ALL'], ['float', 'FLOAT'], ['top', 'TOP SPIN']].map(([v, l]) => (
          <button key={v} className={chip(normalizeServeType(chartType) === normalizeServeType(v))} onClick={() => setChartType(v)}>{l}</button>
        ))}
      </div>
      {showPlayerPills && <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button className={chip(activePick == null)} onClick={() => setPick(null)}>All</button>
        {serverIds.map((id) => (
          <button key={id} className={chip(activePick === id)} onClick={() => setPick(id)}>{playerNames[id] ?? 'Player'}</button>
        ))}
      </div>}
      <div className="flex justify-center gap-3 text-xs">
        <span className="text-yellow-400 font-bold">★ {aces} ace{aces !== 1 ? 's' : ''}</span>
        <span className="text-emerald-400 font-bold">○ {ins} in-play</span>
      </div>
      <div className="rounded-lg overflow-hidden" style={{ aspectRatio: `${RW} / ${RH}` }}>
        <svg viewBox={`0 0 ${RW} ${RH}`} style={{ width: '100%', height: '100%', display: 'block' }}>
          <rect width={RW} height={RH} fill="#0f172a" />

          {/* Zone cells with count overlay */}
          {RETICLE_ZONE_GRID.map((row, ri) =>
            row.map((zone, ci) => {
              const x  = ci * (RW / 3);
              const y  = ri * (RH / 2);
              const ct = zoneCounts[zone] ?? 0;
              return (
                <g key={zone}>
                  <rect x={x} y={y} width={RW / 3} height={RH / 2}
                    fill="transparent" stroke="#334155" strokeWidth={1} />
                  <text x={x + RW / 6} y={y + RH / 4}
                    textAnchor="middle" dominantBaseline="middle"
                    fill="rgba(148,163,184,0.25)" fontSize={22} fontWeight="bold"
                  >{zone}</text>
                  {ct > 0 && (
                    <text x={x + RW / 3 - 10} y={y + 18}
                      textAnchor="end" dominantBaseline="middle"
                      fill="rgba(148,163,184,0.5)" fontSize={13} fontWeight="bold"
                    >×{ct}</text>
                  )}
                </g>
              );
            })
          )}

          {/* Net line */}
          <line x1={0} y1={RH - 2} x2={RW} y2={RH - 2} stroke="#e8530b" strokeWidth={3} />
          <text x={RW / 2} y={RH - 14} textAnchor="middle" dominantBaseline="middle"
            fill="#e8530b" fontSize={18} fontWeight="bold" letterSpacing={4} opacity={0.75}
          >NET</text>

          {/* Reticles */}
          {serves.map((c) =>
            c.result === 'ace' ? (
              <text key={c.id} x={c.court_x * RW} y={c.court_y * RH}
                textAnchor="middle" dominantBaseline="middle"
                fontSize={16} fill="#f59e0b"
              >★</text>
            ) : (
              <circle key={c.id} cx={c.court_x * RW} cy={c.court_y * RH}
                r={7} fill="rgba(52,211,153,0.2)" stroke="#34d399" strokeWidth={2}
              />
            )
          )}
        </svg>
      </div>
    </div>
  );
}
