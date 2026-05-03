import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useMatchStore } from '../../store/matchStore';
import { useHistoricalPQ } from '../../hooks/useWinProbability';
import {
  computePlayerStats, computeTeamStats, computeRotationStats,
  computePointQuality, computeOppDisplayStats, computeXKByPassRating,
  computePQ, computeSetWinProb, computeMatchWinProb,
} from '../../stats/engine';
import { FORMAT } from '../../constants';
import { TAB_COLUMNS, SERVING_COLS, ROTATION_COLS } from '../../stats/columns';
import { StatTable } from '../stats/StatTable';
import { SubToggle } from '../stats/SubToggle';
import { SetTrendsChart } from '../stats/SetTrendsChart';
import { RallyHistogram } from '../stats/RallyHistogram';
import { PlayerComparison } from '../stats/PlayerComparison';
import { PointQualityPanel } from '../stats/PointQualityPanel';
import { RotationSpotlight } from '../stats/RotationSpotlight';
import { RotationBarChart } from '../charts/RotationBarChart';
import { RotationRadarChart } from '../charts/RotationRadarChart';
import { CourtHeatMap } from '../charts/CourtHeatMap';
import { RecordAlertPanel } from './RecordAlertPanel';
import { CourtWhiteboard } from './CourtWhiteboard';
import { fmtPct, fmtHitting } from '../../stats/formatters';

const TABS = [
  { value: 'scoring',   label: 'Scoring'   },
  { value: 'trends',    label: 'Trends'    },
  { value: 'serving',   label: 'Serving'   },
  { value: 'passing',   label: 'Passing'   },
  { value: 'attacking', label: 'Attacking' },
  { value: 'blocking',  label: 'Blocking'  },
  { value: 'defense',   label: 'Defense'   },
  { value: 'ver',       label: 'VER'       },
  { value: 'compare',   label: 'Compare'   },
  { value: 'opp',       label: 'Opp'       },
];

const CIRCUMFERENCE = 2 * Math.PI * 54; // ≈ 339.3

const MILESTONE_ORDER = ['beat', 'tie', 'one_away', 'pct90', 'pct80'];

// Classify the decisive contact of a rally into a short label
function classifyPoint(lastContact, pointWinner) {
  if (!lastContact) return { label: '?', ours: pointWinner === 'us' };
  const { action, result, opponent_contact: opp } = lastContact;
  const ours = pointWinner === 'us';

  let label = '?';
  if (!opp) {
    if (action === 'serve'  && result === 'ace')   label = 'ACE';
    else if (action === 'serve'  && result === 'error')  label = 'SE';
    else if (action === 'attack' && result === 'kill')   label = 'K';
    else if (action === 'attack' && result === 'error')  label = 'AE';
    else if (action === 'block'  && (result === 'solo' || result === 'assist')) label = 'BLK';
    else if (action === 'error')                         label = 'ERR';
  } else {
    if (action === 'serve'  && result === 'error')  label = 'OPP SE';
    else if (action === 'attack' && result === 'error')  label = 'OPP AE';
    else if (action === 'attack' && result === 'kill')   label = 'OPP K';
    else if (action === 'block'  && result === 'solo')   label = 'OPP BLK';
    else if (action === 'error')                         label = 'OPP ERR';
  }
  return { label, ours };
}

export function TimeoutOverlay({ onClose, recordAlerts = [], scoreAtLastTimeout = null }) {
  const [activeTab,      setActiveTab]      = useState('scoring');
  const [scope,          setScope]          = useState('set');
  const [serveView,      setServeView]      = useState('all');
  const [passingView,    setPassingView]    = useState('passing');
  const [trendsView,     setTrendsView]     = useState('trends');
  const [attackView,     setAttackView]     = useState('players');
  const [secondsLeft,    setSecondsLeft]    = useState(60);
  const [showWhiteboard, setShowWhiteboard] = useState(false);

  const lineup            = useMatchStore((s) => s.lineup);
  const setNumber         = useMatchStore((s) => s.setNumber);
  const committedContacts = useMatchStore((s) => s.committedContacts);
  const committedRallies  = useMatchStore((s) => s.committedRallies);
  const currentSetId      = useMatchStore((s) => s.currentSetId);
  const ourScore          = useMatchStore((s) => s.ourScore);
  const oppScore          = useMatchStore((s) => s.oppScore);
  const rotationNum       = useMatchStore((s) => s.rotationNum);
  const pointHistory      = useMatchStore((s) => s.pointHistory);
  const serveSide         = useMatchStore((s) => s.serveSide);
  const ourSetsWon        = useMatchStore((s) => s.ourSetsWon);
  const oppSetsWon        = useMatchStore((s) => s.oppSetsWon);
  const format            = useMatchStore((s) => s.format);
  const matchId           = useMatchStore((s) => s.matchId);

  const historicalPQ = useHistoricalPQ(matchId);

  const setContacts = useMemo(
    () => scope === 'set'
      ? committedContacts.filter((c) => c.set_id === currentSetId)
      : committedContacts,
    [committedContacts, currentSetId, scope]
  );

  const setRallies = useMemo(
    () => scope === 'set'
      ? committedRallies.filter((r) => r.set_id === currentSetId)
      : committedRallies,
    [committedRallies, currentSetId, scope]
  );

  const timelineData = useMemo(() => {
    const sorted = [...setRallies].sort((a, b) => a.rally_number - b.rally_number);
    const pts = [{ x: 0, us: 0, opp: 0 }];
    let us = 0, opp = 0;
    for (const r of sorted) {
      if (r.point_winner === 'us') us++;
      else opp++;
      pts.push({ x: pts.length, us, opp });
    }
    return pts;
  }, [setRallies]);

  const playerStats  = useMemo(() => computePlayerStats(setContacts, 1),  [setContacts]);
  const teamStats    = useMemo(() => computeTeamStats(setContacts, 1),    [setContacts]);
  const pointQuality = useMemo(() => computePointQuality(setContacts),    [setContacts]);
  const oppStats     = useMemo(() => computeOppDisplayStats(setContacts), [setContacts]);

  const rotationStats = useMemo(() => computeRotationStats(setRallies), [setRallies]);

  const winProbHistory = useMemo(() => {
    if (!committedRallies.length) return [];
    const setsToWin = format === FORMAT.BEST_OF_5 ? 3 : 2;
    const { p, q } = computePQ(committedRallies, historicalPQ?.p, historicalPQ?.q);
    const pFutureSet = computeSetWinProb(p, q, 0, 0, 'them', false);

    const sorted = [...committedRallies].sort((a, b) =>
      a.set_number !== b.set_number ? a.set_number - b.set_number : a.rally_number - b.rally_number
    );

    let usScore = 0, themScore = 0, useSets = 0, oppSets = 0, side = serveSide;
    const data = [];

    for (const r of sorted) {
      const isDecider = (useSets + oppSets + 1) >= setsToWin * 2 - 1;
      const setWin = computeSetWinProb(p, q, usScore, themScore, side, isDecider);
      const matchWin = computeMatchWinProb(setWin, pFutureSet, useSets, oppSets, setsToWin);
      data.push({ x: data.length + 1, pct: Math.round(matchWin * 100) });

      if (r.point_winner === 'us') {
        usScore++;
        side = 'us';
      } else {
        themScore++;
        side = 'them';
      }
      const setTarget = isDecider ? 15 : 25;
      if ((usScore >= setTarget || themScore >= setTarget) && Math.abs(usScore - themScore) >= 2) {
        if (usScore > themScore) useSets++; else oppSets++;
        usScore = 0; themScore = 0; side = useSets > oppSets ? 'them' : 'us';
      }
    }
    return data;
  }, [committedRallies, format, serveSide]);

  const currentWinProbs = useMemo(() => {
    const setsToWin = format === FORMAT.BEST_OF_5 ? 3 : 2;
    const isDecider = setNumber === (format === FORMAT.BEST_OF_5 ? 5 : 3);
    const { p, q } = computePQ(committedRallies, historicalPQ?.p, historicalPQ?.q);
    const setWinProb = computeSetWinProb(p, q, ourScore, oppScore, serveSide, isDecider);
    const pFutureSet = computeSetWinProb(p, q, 0, 0, 'them', false);
    const mwp = computeMatchWinProb(setWinProb, pFutureSet, ourSetsWon, oppSetsWon, setsToWin);
    return { setWinProb, matchWinProb: mwp, p, q };
  }, [committedRallies, ourScore, oppScore, serveSide, setNumber, format, ourSetsWon, oppSetsWon]);

  const xkByPass = useMemo(() => {
    const raw = computeXKByPassRating(setContacts);
    const agg = { '1': { ta:0, k:0, ae:0 }, '2': { ta:0, k:0, ae:0 }, '3': { ta:0, k:0, ae:0 } };
    for (const ps of Object.values(raw)) {
      for (const r of ['1','2','3']) {
        agg[r].ta += ps[`xk${r}_ta`] ?? 0;
        agg[r].k  += ps[`xk${r}_k`]  ?? 0;
        agg[r].ae += ps[`xk${r}_ae`] ?? 0;
      }
    }
    return ['3','2','1'].map((r) => ({
      rating:  r,
      label:   r === '3' ? 'PASS 3' : r === '2' ? 'PASS 2' : 'PASS 1',
      sub:     r === '3' ? 'Perfect' : r === '2' ? 'Good' : 'Poor',
      ta:      agg[r].ta,
      k:       agg[r].k,
      ae:      agg[r].ae,
      k_pct:   agg[r].ta > 0 ? agg[r].k / agg[r].ta : null,
      hit_pct: agg[r].ta > 0 ? (agg[r].k - agg[r].ae) / agg[r].ta : null,
    }));
  }, [setContacts]);

  const attackDistByPos = useMemo(() => {
    const posMap = {};
    for (const sl of lineup) {
      if (sl.playerId) posMap[sl.playerId] = sl.positionLabel ?? '';
    }
    const normalize = (lbl) => {
      if (!lbl) return null;
      const u = lbl.toUpperCase();
      if (u === 'OH' || u === 'DS') return 'OUTSIDE';
      if (u === 'MB')               return 'MIDDLE';
      if (u === 'OPP' || u === 'RS') return 'OPPOSITE';
      if (u === 'S')                return 'SETTER';
      return null;
    };
    const groups = {};
    for (const c of setContacts) {
      if (c.action !== 'attack' || c.opponent_contact) continue;
      const cat = normalize(posMap[c.player_id]);
      if (!cat) continue;
      if (!groups[cat]) groups[cat] = { ta: 0, k: 0, ae: 0 };
      groups[cat].ta++;
      if (c.result === 'kill')  groups[cat].k++;
      if (c.result === 'error') groups[cat].ae++;
    }
    const totalTA = Object.values(groups).reduce((s, g) => s + g.ta, 0);
    return ['OUTSIDE', 'MIDDLE', 'OPPOSITE', 'SETTER'].map((cat) => {
      const g = groups[cat] ?? { ta: 0, k: 0, ae: 0 };
      return {
        cat,
        ta:      g.ta,
        k:       g.k,
        ae:      g.ae,
        pct:     totalTA > 0 ? g.ta / totalTA : null,
        k_pct:   g.ta > 0 ? g.k / g.ta : null,
        hit_pct: g.ta > 0 ? (g.k - g.ae) / g.ta : null,
      };
    });
  }, [setContacts, lineup]);

  const rotationRows = useMemo(() => {
    if (!rotationStats?.rotations) return [];
    return Object.entries(rotationStats.rotations).map(([n, r]) => ({
      id:     Number(n),
      name:   `Rotation ${n}`,
      so_pct: r.so_pct ?? null,
      so_opp: r.so_opp,
      so_win: r.so_win,
      bp_pct: r.bp_pct ?? null,
      bp_opp: r.bp_opp,
      bp_win: r.bp_win,
    }));
  }, [rotationStats]);

  const currentRotStat = rotationStats.rotations?.[rotationNum] ?? null;

  // ── Feature 2: Error leader (SE + AE combined) ────────────────────────────
  const errorLeader = useMemo(() => {
    const onCourt = lineup.filter((sl) => sl.playerId);
    let worst = null;
    for (const sl of onCourt) {
      const ps = playerStats[sl.playerId];
      if (!ps) continue;
      const errs = (ps.se ?? 0) + (ps.ae ?? 0);
      if (errs > 0 && (!worst || errs > worst.errs)) {
        worst = { name: sl.playerName, errs, se: ps.se ?? 0, ae: ps.ae ?? 0 };
      }
    }
    return worst;
  }, [lineup, playerStats]);

  // ── Feature 3: Point type breakdown of last 10 rallies ────────────────────
  const pointBreakdown = useMemo(() => {
    const last10 = setRallies.slice(-10);
    const contactsByRally = {};
    for (const c of setContacts) {
      const key = c.rally_number;
      if (!contactsByRally[key] || c.timestamp > contactsByRally[key].timestamp) {
        contactsByRally[key] = c;
      }
    }
    return last10.map((r) => classifyPoint(contactsByRally[r.rally_number], r.point_winner));
  }, [setRallies, setContacts]);

  // Decrement timer every second
  useEffect(() => {
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-close when timer hits 0
  useEffect(() => {
    if (secondsLeft <= 0) onClose();
  }, [secondsLeft, onClose]);

  const playerRows = lineup
    .filter((sl) => sl.playerId)
    .map((sl) => {
      const ps = playerStats[sl.playerId] ?? {};
      return { id: sl.playerId, name: sl.playerName, ...ps };
    });

  const totalsRow = useMemo(() => ({ name: 'Total', ...teamStats }), [teamStats]);

  const currentSet = useMemo(
    () => [{ id: currentSetId, set_number: setNumber }],
    [currentSetId, setNumber]
  );

  const strokeDashoffset = CIRCUMFERENCE * (1 - Math.max(secondsLeft, 0) / 60);
  const ringColor =
    secondsLeft >= 30 ? '#22c55e' :
    secondsLeft >= 15 ? '#eab308' :
    '#ef4444';

  function soColor(pct) {
    if (pct == null) return 'text-slate-400';
    if (pct < 0.40) return 'text-red-400';
    if (pct < 0.50) return 'text-yellow-400';
    if (pct >= 0.60) return 'text-emerald-400';
    return 'text-slate-300';
  }
  function bpColor(pct) {
    if (pct == null) return 'text-slate-400';
    if (pct < 0.25) return 'text-red-400';
    if (pct < 0.38) return 'text-yellow-400';
    if (pct >= 0.50) return 'text-emerald-400';
    return 'text-slate-300';
  }

  return (
    <div className="fixed inset-0 z-[60] bg-slate-900/95 flex">

      {/* Left panel: tabbed stat table */}
      <div className="flex flex-col w-[65%] border-r border-slate-700">
        <div className="flex items-center px-4 py-3 border-b border-slate-700 shrink-0 gap-4">
          <span className="text-white font-bold text-lg tracking-wide">
            TIMEOUT · Set {setNumber}
          </span>
          <button
            onPointerDown={(e) => { e.preventDefault(); setShowWhiteboard(true); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold"
          >
            ✏ Court White Board
          </button>
        </div>

        {/* Team summary strip */}
        {(() => {
          const t = teamStats;
          const n = (v) => v ?? 0;
          const pct = (v) => v != null ? Math.round(v * 100) + '%' : '—';
          const dec1 = (v) => v != null ? v.toFixed(1) : '—';
          const groups = [
            { label: 'SERVING',   items: [`${n(t.sa)} SA`, `${n(t.ace)} ACE`, `${n(t.se)} SE`, `${pct(t.si_pct)} S%`] },
            { label: 'ATTACKING', items: [`${n(t.ta)} TA`, `${n(t.k)} K`, `${n(t.ae)} AE`, `${fmtHitting(t.hit_pct)} HIT`] },
            { label: 'PASSING',   items: [`${n(t.pa)} PA`, `${dec1(t.apr)} APR`, `${pct(t.pp_pct)} 3OPT`] },
            { label: 'BLOCKING',  items: [`${n(t.bs)} BS`, `${n(t.ba)} BA`] },
            { label: 'DEFENSE',   items: [`${n(t.dig)} DIG`, `${n(t.de)} DE`] },
          ];
          return (
            <div className="flex border-b border-slate-700 shrink-0 bg-slate-800/50 divide-x divide-slate-700">
              {groups.map((g) => (
                <div key={g.label} className="flex flex-col px-3 py-2 gap-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{g.label}</span>
                  <div className="flex flex-wrap gap-x-2 gap-y-0.5">
                    {g.items.map((item) => (
                      <span key={item} className="text-sm font-semibold text-slate-200 whitespace-nowrap">{item}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          );
        })()}

        {/* SET / MATCH scope toggle */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-700 shrink-0 bg-slate-900/40">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mr-1">Scope</span>
          <div className="flex bg-slate-800 rounded-lg p-0.5">
            {[['set', `SET ${setNumber}`], ['match', 'MATCH']].map(([val, label]) => (
              <button
                key={val}
                onPointerDown={(e) => { e.preventDefault(); setScope(val); }}
                className={`px-4 py-1 rounded-md text-xs font-black tracking-wider transition-colors ${
                  scope === val
                    ? 'bg-primary text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable tab bar */}
        <div className="flex overflow-x-auto border-b border-slate-700 shrink-0" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              onPointerDown={(e) => { e.preventDefault(); setActiveTab(value); }}
              className={`flex-shrink-0 px-3 py-2 text-xs font-semibold tracking-wide whitespace-nowrap ${
                activeTab === value
                  ? 'text-primary border-b-2 border-primary'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">

          {activeTab === 'scoring' && (
            <PointQualityPanel pq={pointQuality} oppScored={oppScore} />
          )}

          {activeTab === 'trends' && (
            <>
              <SubToggle
                options={[['trends', 'TRENDS'], ['rotation', 'ROTATION']]}
                value={trendsView}
                onChange={setTrendsView}
              />
              {trendsView === 'trends' && (
                <div className="space-y-8">
                  <SetTrendsChart contacts={setContacts} sets={currentSet} />
                  <div className="border-t border-slate-700/50 pt-6">
                    <RallyHistogram contacts={setContacts} />
                  </div>
                </div>
              )}
              {trendsView === 'rotation' && (
                <div className="space-y-4">
                  <RotationBarChart rotationRows={rotationRows} />
                  <RotationRadarChart rotationStats={rotationStats} />
                  <RotationSpotlight rows={rotationRows} />
                  <StatTable columns={ROTATION_COLS} rows={rotationRows} />
                  <div className="grid grid-cols-2 gap-4 text-sm text-center">
                    <div className="bg-surface rounded-xl p-3">
                      <div className="text-xs text-slate-400">Overall SO%</div>
                      <div className="text-lg font-bold text-primary">{fmtPct(rotationStats.so_pct)}</div>
                    </div>
                    <div className="bg-surface rounded-xl p-3">
                      <div className="text-xs text-slate-400">Overall SP%</div>
                      <div className="text-lg font-bold text-sky-400">{fmtPct(rotationStats.bp_pct)}</div>
                    </div>
                  </div>
                  <CourtHeatMap contacts={setContacts} />
                </div>
              )}
            </>
          )}

          {activeTab === 'serving' && (
            <>
              <SubToggle
                options={[['all', 'ALL'], ['float', 'FLOAT'], ['top', 'TOP SPIN']]}
                value={serveView}
                onChange={setServeView}
              />
              <StatTable columns={SERVING_COLS[serveView]} rows={playerRows} totalsRow={totalsRow} />
            </>
          )}

          {activeTab === 'passing' && (
            <>
              <SubToggle
                options={[['passing', 'PASSING'], ['setting', 'SETTING']]}
                value={passingView}
                onChange={setPassingView}
              />
              <StatTable columns={TAB_COLUMNS[passingView]} rows={playerRows} totalsRow={totalsRow} />
            </>
          )}

          {activeTab === 'attacking' && (
            <>
              <SubToggle
                options={[['players', 'PLAYERS'], ['position', 'BY POSITION'], ['pass', 'BY PASS']]}
                value={attackView}
                onChange={setAttackView}
              />
              {attackView === 'players' && (
                <StatTable columns={TAB_COLUMNS['attacking']} rows={playerRows} totalsRow={totalsRow} />
              )}
              {attackView === 'position' && (
                <div className="space-y-1">
                  {/* Header */}
                  <div className="grid grid-cols-7 gap-1 px-1 pb-1 border-b border-slate-700">
                    {['POS', '%', 'TA', 'K', 'AE', 'K%', 'HIT%'].map((h) => (
                      <div key={h} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">{h}</div>
                    ))}
                  </div>
                  {/* Rows */}
                  {attackDistByPos.map(({ cat, ta, k, ae, pct, k_pct, hit_pct }) => (
                    <div
                      key={cat}
                      className={`grid grid-cols-7 gap-1 px-1 py-2 rounded-lg ${ta > 0 ? 'bg-slate-800/60' : 'opacity-40'}`}
                    >
                      <div className="text-xs font-black text-primary text-center leading-tight">{cat}</div>
                      <div className="text-xs font-bold text-slate-200 text-center tabular-nums">
                        {pct != null ? Math.round(pct * 100) + '%' : '—'}
                      </div>
                      <div className="text-xs font-bold text-slate-200 text-center tabular-nums">{ta || '—'}</div>
                      <div className="text-xs font-bold text-emerald-400 text-center tabular-nums">{ta > 0 ? k : '—'}</div>
                      <div className="text-xs font-bold text-red-400 text-center tabular-nums">{ta > 0 ? ae : '—'}</div>
                      <div className="text-xs font-bold text-slate-200 text-center tabular-nums">
                        {k_pct != null ? Math.round(k_pct * 100) + '%' : '—'}
                      </div>
                      <div className={`text-xs font-bold text-center tabular-nums ${
                        hit_pct == null ? 'text-slate-500' :
                        hit_pct >= 0.3  ? 'text-emerald-400' :
                        hit_pct >= 0.1  ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {hit_pct != null ? fmtHitting(hit_pct) : '—'}
                      </div>
                    </div>
                  ))}
                  {/* Totals */}
                  {(() => {
                    const tot = attackDistByPos.reduce((s, r) => ({
                      ta: s.ta + r.ta, k: s.k + r.k, ae: s.ae + r.ae,
                    }), { ta: 0, k: 0, ae: 0 });
                    const hit = tot.ta > 0 ? (tot.k - tot.ae) / tot.ta : null;
                    const kp  = tot.ta > 0 ? tot.k / tot.ta : null;
                    return (
                      <div className="grid grid-cols-7 gap-1 px-1 py-2 border-t border-slate-700 mt-1">
                        <div className="text-[10px] font-black text-slate-400 text-center">TOTAL</div>
                        <div className="text-xs font-bold text-slate-400 text-center">100%</div>
                        <div className="text-xs font-bold text-slate-300 text-center tabular-nums">{tot.ta || '—'}</div>
                        <div className="text-xs font-bold text-emerald-400 text-center tabular-nums">{tot.ta > 0 ? tot.k : '—'}</div>
                        <div className="text-xs font-bold text-red-400 text-center tabular-nums">{tot.ta > 0 ? tot.ae : '—'}</div>
                        <div className="text-xs font-bold text-slate-300 text-center tabular-nums">
                          {kp != null ? Math.round(kp * 100) + '%' : '—'}
                        </div>
                        <div className={`text-xs font-bold text-center tabular-nums ${
                          hit == null ? 'text-slate-500' :
                          hit >= 0.3  ? 'text-emerald-400' :
                          hit >= 0.1  ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {hit != null ? fmtHitting(hit) : '—'}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
              {attackView === 'pass' && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">First-ball attack after serve receive</p>
                  {/* Header */}
                  <div className="grid grid-cols-6 gap-1 px-1 pb-1 border-b border-slate-700">
                    {['PASS', 'TA', 'K', 'AE', 'K%', 'HIT%'].map((h) => (
                      <div key={h} className="text-[10px] font-bold uppercase tracking-wider text-slate-500 text-center">{h}</div>
                    ))}
                  </div>
                  {xkByPass.map(({ rating, label, sub, ta, k, ae, k_pct, hit_pct }) => (
                    <div
                      key={rating}
                      className={`grid grid-cols-6 gap-1 px-1 py-2.5 rounded-lg ${ta > 0 ? 'bg-slate-800/60' : 'opacity-40'}`}
                    >
                      <div className="text-center">
                        <div className="text-xs font-black text-primary leading-none">{label}</div>
                        <div className="text-[9px] text-slate-500 leading-none mt-0.5">{sub}</div>
                      </div>
                      <div className="text-xs font-bold text-slate-200 text-center tabular-nums self-center">{ta || '—'}</div>
                      <div className="text-xs font-bold text-emerald-400 text-center tabular-nums self-center">{ta > 0 ? k : '—'}</div>
                      <div className="text-xs font-bold text-red-400 text-center tabular-nums self-center">{ta > 0 ? ae : '—'}</div>
                      <div className="text-xs font-bold text-slate-200 text-center tabular-nums self-center">
                        {k_pct != null ? Math.round(k_pct * 100) + '%' : '—'}
                      </div>
                      <div className={`text-xs font-bold text-center tabular-nums self-center ${
                        hit_pct == null ? 'text-slate-500' :
                        hit_pct >= 0.3  ? 'text-emerald-400' :
                        hit_pct >= 0.1  ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {hit_pct != null ? fmtHitting(hit_pct) : '—'}
                      </div>
                    </div>
                  ))}
                  {/* K% bar chart */}
                  {xkByPass.some(r => r.ta > 0) && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">K% by pass quality</p>
                      {xkByPass.map(({ label, k_pct }) => (
                        <div key={label} className="flex items-center gap-2">
                          <span className="text-[10px] font-black text-slate-400 w-14 shrink-0">{label}</span>
                          <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: k_pct != null ? `${Math.round(k_pct * 100)}%` : '0%',
                                background: k_pct == null ? 'transparent' :
                                  k_pct >= 0.5 ? '#4ade80' : k_pct >= 0.35 ? '#facc15' : '#f87171',
                              }}
                            />
                          </div>
                          <span className="text-[10px] font-black text-slate-300 w-8 text-right tabular-nums">
                            {k_pct != null ? Math.round(k_pct * 100) + '%' : '—'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {activeTab === 'blocking' && (
            <StatTable columns={TAB_COLUMNS['blocking']} rows={playerRows} totalsRow={totalsRow} />
          )}

          {activeTab === 'defense' && (
            <StatTable columns={TAB_COLUMNS['defense']} rows={playerRows} totalsRow={totalsRow} />
          )}

          {activeTab === 'ver' && (
            <StatTable columns={TAB_COLUMNS['ver']} rows={playerRows} totalsRow={totalsRow} />
          )}

          {activeTab === 'compare' && (
            <PlayerComparison playerRows={playerRows} />
          )}

          {activeTab === 'opp' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400">Opponent performance this set</p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'ACE',  val: oppStats.ace,  desc: 'Aces vs us'          },
                  { label: 'SE',   val: oppStats.se,   desc: 'Serve errors'         },
                  { label: 'K',    val: oppStats.k,    desc: 'Kills'                },
                  { label: 'AE',   val: oppStats.ae,   desc: 'Attack errors'        },
                  { label: 'BLK',  val: oppStats.blk,  desc: 'Blocked by us'        },
                  { label: 'ERR',  val: oppStats.errs, desc: 'Ball handling errors' },
                ].map(({ label, val, desc }) => (
                  <div key={label} className="bg-surface rounded-xl p-3 text-center">
                    <div className="text-xs text-slate-400 mb-1">{desc}</div>
                    <div className="text-2xl font-black text-primary">{val}</div>
                    <div className="text-xs font-bold text-slate-300 mt-0.5">{label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Score timeline for current set */}
        {timelineData.length > 1 && (
          <div className="shrink-0 border-t border-slate-700 px-3 pt-2 pb-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">{scope === 'set' ? `Set ${setNumber}` : 'Match'} Timeline</p>
            <ResponsiveContainer width="100%" height={90}>
              <LineChart data={timelineData} margin={{ top: 2, right: 6, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="x" hide />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 10 }} domain={[0, 25]} ticks={[5, 10, 15, 20, 25]} interval={0} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '4px 8px' }}
                  formatter={(val, name) => [val, name === 'us' ? 'Us' : 'Opp']}
                  labelFormatter={() => ''}
                />
                <Line type="monotone" dataKey="us"  stroke="#f97316" strokeWidth={2} dot={false} name="us" />
                <Line type="monotone" dataKey="opp" stroke="#94a3b8" strokeWidth={2} dot={false} name="opp" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Right panel */}
      <div className="flex flex-col items-center justify-center gap-3 flex-1 px-3">

        {/* Current score */}
        <div className="text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Set {setNumber} Score</div>
          <div className="text-4xl font-black tabular-nums tracking-tight">
            <span className="text-white">{ourScore}</span>
            <span className="text-slate-500 mx-1">–</span>
            <span className="text-slate-400">{oppScore}</span>
          </div>
        </div>

        {/* Set win probability */}
        <div className="text-center w-full">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Set Win Probability</div>
          <div className="flex justify-center items-center gap-4">
            <div className="text-center">
              <div className={`text-3xl font-black tabular-nums ${
                currentWinProbs.setWinProb >= 0.60 ? 'text-emerald-400' :
                currentWinProbs.setWinProb <= 0.40 ? 'text-red-400' : 'text-slate-200'
              }`}>
                {Math.round(currentWinProbs.setWinProb * 100)}%
              </div>
              <div className="text-[9px] text-slate-500 mt-0.5">THIS SET</div>
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-6">SO%</span>
                <span className={`text-xs font-black ${soColor(currentWinProbs.p)}`}>
                  {Math.round(currentWinProbs.p * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500 w-6">SP%</span>
                <span className={`text-xs font-black ${bpColor(currentWinProbs.q)}`}>
                  {Math.round(currentWinProbs.q * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Score since last timeout */}
        {scoreAtLastTimeout !== null && (
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Since Last TO</div>
            <div className="text-lg font-bold tabular-nums">
              <span className={ourScore - scoreAtLastTimeout.us > oppScore - scoreAtLastTimeout.them ? 'text-emerald-400' : 'text-white'}>
                +{ourScore - scoreAtLastTimeout.us}
              </span>
              <span className="text-slate-500 mx-1">–</span>
              <span className={oppScore - scoreAtLastTimeout.them > ourScore - scoreAtLastTimeout.us ? 'text-red-400' : 'text-slate-400'}>
                +{oppScore - scoreAtLastTimeout.them}
              </span>
            </div>
          </div>
        )}

        {/* Point type breakdown */}
        {pointBreakdown.length > 0 && (
          <div className="text-center w-full">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
              Last {pointBreakdown.length} Points
            </div>
            <div className="flex gap-1 justify-center flex-wrap">
              {pointBreakdown.map((pt, i) => (
                <div
                  key={i}
                  className={clsx(
                    'px-1.5 py-0.5 rounded text-[10px] font-black leading-none',
                    pt.ours
                      ? 'bg-emerald-900/60 text-emerald-300 border border-emerald-700/50'
                      : 'bg-red-900/60 text-red-300 border border-red-700/50'
                  )}
                >
                  {pt.label}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Win probability graph */}
        {winProbHistory.length > 1 && (() => {
          const current = winProbHistory[winProbHistory.length - 1].pct;
          const prev    = winProbHistory[winProbHistory.length - 2].pct;
          const trend   = current > prev ? '↑' : current < prev ? '↓' : '→';
          const color   = current >= 60 ? '#4ade80' : current <= 40 ? '#f87171' : '#94a3b8';
          return (
            <div className="w-full">
              <div className="flex items-baseline justify-between mb-1 px-0.5">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Win Probability</span>
                <span className="text-lg font-black tabular-nums" style={{ color }}>
                  {current}% <span className="text-sm">{trend}</span>
                </span>
              </div>
              <ResponsiveContainer width="100%" height={56}>
                <LineChart data={winProbHistory} margin={{ top: 2, right: 2, left: -36, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="x" hide />
                  <YAxis domain={[0, 100]} hide />
                  <ReferenceLine y={50} stroke="#334155" strokeDasharray="4 3" strokeWidth={1} />
                  <Line
                    type="monotone"
                    dataKey="pct"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          );
        })()}

        {/* Rotation SO%/BP% */}
        <div className="text-center w-full">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">
            R{rotationNum} This Set
          </div>
          <div className="flex gap-3 justify-center">
            <div className="text-center">
              <div className="text-[10px] text-slate-500 mb-0.5">SO%</div>
              <div className={`text-lg font-black ${soColor(currentRotStat?.so_pct)}`}>
                {currentRotStat?.so_opp > 0 ? fmtPct(currentRotStat.so_pct) : '—'}
              </div>
              {currentRotStat?.so_opp > 0 && (
                <div className="text-[9px] text-slate-600">{currentRotStat.so_win}/{currentRotStat.so_opp}</div>
              )}
            </div>
            <div className="w-px bg-slate-700 self-stretch" />
            <div className="text-center">
              <div className="text-[10px] text-slate-500 mb-0.5">SP%</div>
              <div className={`text-lg font-black ${bpColor(currentRotStat?.bp_pct)}`}>
                {currentRotStat?.bp_opp > 0 ? fmtPct(currentRotStat.bp_pct) : '—'}
              </div>
              {currentRotStat?.bp_opp > 0 && (
                <div className="text-[9px] text-slate-600">{currentRotStat.bp_win}/{currentRotStat.bp_opp}</div>
              )}
            </div>
          </div>
          <div className="flex gap-3 justify-center mt-1 pt-1 border-t border-slate-800">
            <div className="text-center">
              <div className="text-[10px] text-slate-600 mb-0.5">Match SO%</div>
              <div className={`text-sm font-black ${soColor(currentWinProbs.p)}`}>
                {Math.round(currentWinProbs.p * 100)}%
              </div>
            </div>
            <div className="w-px bg-slate-800 self-stretch" />
            <div className="text-center">
              <div className="text-[10px] text-slate-600 mb-0.5">Match SP%</div>
              <div className={`text-sm font-black ${bpColor(currentWinProbs.q)}`}>
                {Math.round(currentWinProbs.q * 100)}%
              </div>
            </div>
          </div>
        </div>

        {/* Error leader */}
        {errorLeader && (
          <div className="text-center">
            <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Error Leader</div>
            <div className="flex items-center gap-2 justify-center">
              <span className="text-red-400 font-black text-lg">{errorLeader.errs}</span>
              <span className="text-slate-300 font-semibold text-sm">{errorLeader.name}</span>
              <span className="text-[10px] text-slate-500">
                {errorLeader.se > 0 && `${errorLeader.se} SE`}
                {errorLeader.se > 0 && errorLeader.ae > 0 && ' · '}
                {errorLeader.ae > 0 && `${errorLeader.ae} AE`}
              </span>
            </div>
          </div>
        )}

        {/* Next server */}
        <div className="text-center">
          <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-0.5">Next Server</div>
          <div className="text-sm font-semibold text-slate-200">
            {(serveSide === 'us' ? lineup[0] : lineup[1])?.playerName || '—'}
          </div>
        </div>

        {/* Record alerts */}
        {recordAlerts.length > 0 && (() => {
          const sorted = [...recordAlerts].sort(
            (a, b) => MILESTONE_ORDER.indexOf(a.milestone) - MILESTONE_ORDER.indexOf(b.milestone)
          );
          return (
            <div className="w-full overflow-y-auto max-h-24">
              <RecordAlertPanel alerts={sorted.slice(0, 3)} />
            </div>
          );
        })()}

        {/* Countdown ring */}
        <svg width="100" height="100" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r="54" fill="none" stroke="#334155" strokeWidth="10" />
          <circle
            cx="70" cy="70" r="54"
            fill="none"
            stroke={ringColor}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 70 70)"
            style={{ transition: 'stroke-dashoffset 0.5s linear, stroke 0.5s' }}
          />
          <text
            x="70" y="70"
            textAnchor="middle"
            dominantBaseline="central"
            fill="white"
            fontSize="28"
            fontWeight="bold"
            fontFamily="monospace"
          >
            {Math.max(secondsLeft, 0)}
          </text>
        </svg>

        <button
          onPointerDown={(e) => { e.preventDefault(); onClose(); }}
          className="px-8 py-2.5 bg-primary hover:brightness-110 text-white font-bold text-sm tracking-widest uppercase rounded active:brightness-75 select-none"
        >
          Resume
        </button>
      </div>

      {showWhiteboard && (
        <CourtWhiteboard onClose={() => setShowWhiteboard(false)} secondsLeft={secondsLeft} />
      )}
    </div>
  );
}
