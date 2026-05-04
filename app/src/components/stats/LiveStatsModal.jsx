import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useShallow } from 'zustand/react/shallow';
import { useLiveQuery } from 'dexie-react-hooks';
import { useMatchStore } from '../../store/matchStore';
import { useMatchStats } from '../../hooks/useMatchStats';
import { db } from '../../db/schema';
import { computeTeamStats, computeOppDisplayStats, computeRotationStats, computeRotationContactStats, computeISvsOOS, computeFreeDigWin, computeTransitionAttack, computePlayerStats, computeXKByPassRating, computePointQuality, computeServingPoints, computeWinCorrelation } from '../../stats/engine';
import { StatTable } from './StatTable';
import { PointQualityPanel } from './PointQualityPanel';
import { fmtCount, fmtPct, fmtHitting, fmtPassRating, fmtVER } from '../../stats/formatters';
import { SERVING_COLS as _SERVING_COLS } from '../../stats/columns';
import { VERBadge } from './VERBadge';
import { SetScoresStrip } from './panels/SetScoresStrip';
import { BoxSparkline } from './panels/BoxSparkline';
import { TeamStatsTable } from './panels/TeamStatsTable';
import { RotationTable } from './panels/RotationTable';
import { ISvsOOSTable, EMPTY_ISVSOOS, EMPTY_FREEDIG, EMPTY_TRANSATK } from './panels/ISvsOOSTable';
import { ServeZoneStatsPanel } from './panels/ServeZoneStatsPanel';
import { OffenseBalanceChart } from './panels/OffenseBalanceChart';
import { RecordsProgressPanel } from './panels/RecordsProgressPanel';

const TABS = ['POINTS', 'SERVING', 'PASSING', 'ATTACKING', 'BLOCKING', 'DEFENSE', 'VER', 'ROTATION', 'RECORDS'];

const SERVE_VIEWS = ['ALL', 'FLOAT', 'TOP'];

const _liveKeys = new Set(['sp', 'mp', 'se_foot']);
const _live = (cols) => cols.filter((c) => !_liveKeys.has(c.key));
const SERVING_COLS = {
  ALL:   _live(_SERVING_COLS.all),
  FLOAT: _live(_SERVING_COLS.float),
  TOP:   _live(_SERVING_COLS.top),
};

const COLUMNS = {
  PASSING: [
    { key: 'name',   label: 'Player' },
    { key: 'pa',     label: 'REC', fmt: fmtCount },
    { key: 'p0',     label: 'P0',  fmt: fmtCount },
    { key: 'p1',     label: 'P1',  fmt: fmtCount },
    { key: 'p2',     label: 'P2',  fmt: fmtCount },
    { key: 'p3',     label: 'P3',  fmt: fmtCount },
    { key: 'apr',    label: 'APR', fmt: fmtPassRating },
    { key: 'pp_pct', label: '3OPT%', fmt: fmtPct },
  ],
  ATTACKING: [
    { key: 'name',    label: 'Player' },
    { key: 'ta',      label: 'TA',   fmt: fmtCount },
    { key: 'k',       label: 'K',    fmt: fmtCount },
    { key: 'ae',      label: 'AE',   fmt: fmtCount },
    { key: 'hit_pct', label: 'HIT%', fmt: fmtHitting },
    { key: 'k_pct',   label: 'K%',   fmt: fmtPct },
  ],
  BLOCKING: [
    { key: 'name', label: 'Player' },
    { key: 'bs',   label: 'BS',  fmt: fmtCount },
    { key: 'ba',   label: 'BA',  fmt: fmtCount },
    { key: 'be',   label: 'BE',  fmt: fmtCount },
    { key: 'bps',  label: 'BPS', fmt: fmtPassRating },
  ],
  DEFENSE: [
    { key: 'name',   label: 'Player' },
    { key: 'dig',    label: 'DIG',  fmt: fmtCount },
    { key: 'fb_dig', label: 'FB',   fmt: fmtCount },
    { key: 'de',     label: 'DE',   fmt: fmtCount },
    { key: 'dips',   label: 'DiPS', fmt: fmtPassRating },
  ],
  VER: [
    { key: 'name', label: 'Player' },
    { key: 'ver',  label: 'VER',  fmt: fmtVER,  render: (v) => <VERBadge ver={v} /> },
    { key: 'k',    label: 'K',    fmt: fmtCount },
    { key: 'ace',  label: 'ACE',  fmt: fmtCount },
    { key: 'bs',   label: 'BS',   fmt: fmtCount },
    { key: 'ba',   label: 'BA',   fmt: fmtCount },
    { key: 'ast',  label: 'AST',  fmt: fmtCount },
    { key: 'dig',  label: 'DIG',  fmt: fmtCount },
    { key: 'ae',   label: 'AE',   fmt: fmtCount },
    { key: 'se',   label: 'SE',   fmt: fmtCount },
    { key: 'bhe',  label: 'BHE',  fmt: fmtCount },
  ],
};

// ── Main Component ────────────────────────────────────────────────────────────
const pct = (v) => v != null ? `${Math.round(v * 100)}%` : '—';
const INSIGHT_METRICS = [
  { label: 'Pass Rating',    key: 'apr',        src: 'team',  fmt: (v) => v != null ? v.toFixed(2) : '—', higherBetter: true  },
  { label: 'Sideout %',     key: 'so_pct',     src: 'rot',   fmt: pct,                                    higherBetter: true  },
  { label: 'Break Point %', key: 'bp_pct',     src: 'rot',   fmt: pct,                                    higherBetter: true  },
  { label: '3OPT %',        key: 'win_pct',    src: 'isOos', fmt: pct,                                    higherBetter: true  },
  { label: 'Kill %',        key: 'k_pct',      src: 'team',  fmt: pct,                                    higherBetter: true  },
  { label: 'Kills',         key: 'k',          src: 'team',  fmt: (v) => v != null ? String(Math.round(v)) : '—', higherBetter: true  },
  { label: 'Attack Errors', key: 'ae',         src: 'team',  fmt: (v) => v != null ? String(Math.round(v)) : '—', higherBetter: false },
  { label: 'Hitting Eff.',  key: 'hit_pct',    src: 'team',  fmt: (v) => v != null ? (v >= 0 ? '+' : '') + v.toFixed(3) : '—', higherBetter: true  },
  { label: 'Earned Pts %',  key: 'earned_pct', src: 'pq',    fmt: pct,                                    higherBetter: true  },
  { label: 'Ace %',         key: 'ace_pct',    src: 'team',  fmt: pct,                                    higherBetter: true  },
];

export const LiveStatsModal = memo(function LiveStatsModal({ open, onClose, teamName, opponentName, recordAlerts = [], records = [], defaultTab = null, seasonRotation = null }) {
  const [activeView, setActiveView] = useState('box');
  const [activeTab,  setActiveTab]  = useState('POINTS');
  const [serveView,  setServeView]  = useState('ALL');
  // scope: a set number (1, 2, 3...) or 'match'
  const [scope, setScope] = useState(1);

  const [winCorr,    setWinCorr]    = useState(null);
  const [corrLoaded, setCorrLoaded] = useState(false);
  const [barsReady,  setBarsReady]  = useState(false);

  const prevOpenRef = useRef(false);

  const {
    ourScore, oppScore, ourSetsWon, oppSetsWon, setNumber, format,
    matchId, teamId, pointHistory, lineup,
    currentSetId, committedContacts, committedRallies,
  } = useMatchStore(useShallow((s) => ({
    ourScore:          s.ourScore,
    oppScore:          s.oppScore,
    ourSetsWon:        s.ourSetsWon,
    oppSetsWon:        s.oppSetsWon,
    setNumber:         s.setNumber,
    format:            s.format,
    matchId:           s.matchId,
    teamId:            s.teamId,
    pointHistory:      s.pointHistory,
    lineup:            s.lineup,
    currentSetId:      s.currentSetId,
    committedContacts: s.committedContacts,
    committedRallies:  s.committedRallies,
  })));

  // Reset scope to current set each time modal opens
  useEffect(() => {
    if (open && !prevOpenRef.current) setScope(setNumber);
    prevOpenRef.current = open;
  }, [open, setNumber]);

  useEffect(() => {
    if (open && defaultTab === 'RECORDS') {
      setActiveView('stats');
      setActiveTab('RECORDS');
    }
  }, [open, defaultTab]);

  const matchRecord = useLiveQuery(
    () => matchId ? db.matches.get(matchId) : null,
    [matchId]
  );
  const insightSeasonId = matchRecord?.season_id ?? null;

  useEffect(() => {
    if (!insightSeasonId || corrLoaded) return;
    setCorrLoaded(true);
    computeWinCorrelation(insightSeasonId)
      .then(setWinCorr)
      .catch(() => {});
  }, [insightSeasonId, corrLoaded]);

  useEffect(() => {
    if (!winCorr) return;
    setBarsReady(false);
    const id = requestAnimationFrame(() => setBarsReady(true));
    return () => cancelAnimationFrame(id);
  }, [winCorr]);

  // Keep hook call for Zustand subscriptions even though we compute stats from scopedContacts
  useMatchStats();

  const allMatchContacts = useLiveQuery(
    () => matchId ? db.contacts.where('match_id').equals(matchId).toArray() : [],
    [matchId]
  );
  const allMatchSets = useLiveQuery(
    () => matchId ? db.sets.where('match_id').equals(matchId).toArray() : [],
    [matchId]
  );
  const allMatchRallies = useLiveQuery(
    () => allMatchSets?.length
      ? Promise.all(allMatchSets.map((s) => db.rallies.where('set_id').equals(s.id).toArray()))
          .then((arrays) => arrays.flat())
      : [],
    [allMatchSets]
  );
  const roster = useLiveQuery(
    () => teamId ? db.players.where('team_id').equals(teamId).filter((p) => p.is_active).toArray() : [],
    [teamId]
  );

  const fullPositionMap = useMemo(() => {
    const map = {};
    for (const p of roster ?? []) map[p.id] = p.position;
    for (const sl of lineup) if (sl.playerId) map[sl.playerId] = sl.positionLabel ?? map[sl.playerId];
    return map;
  }, [roster, lineup]);

  const nameMap = useMemo(
    () => Object.fromEntries((roster ?? []).map(p => [String(p.id), p.name])),
    [roster]
  );

  // Sets that have been started — used to render scope buttons
  const availableSets = useMemo(
    () => (allMatchSets ?? [])
      .filter(s => s.status !== 'scheduled')
      .sort((a, b) => a.set_number - b.set_number),
    [allMatchSets]
  );

  // ── Scoped contacts / rallies ─────────────────────────────────────────────
  const scopedSetId = useMemo(() => {
    if (scope === 'match') return null;
    return (allMatchSets ?? []).find(s => s.set_number === scope)?.id ?? null;
  }, [scope, allMatchSets]);

  const scopedContacts = useMemo(() => {
    if (scope === 'match') return allMatchContacts ?? [];
    if (scopedSetId === currentSetId) return committedContacts;
    if (!scopedSetId) return [];
    return (allMatchContacts ?? []).filter(c => c.set_id === scopedSetId);
  }, [scope, scopedSetId, currentSetId, allMatchContacts, committedContacts]);

  const scopedRallies = useMemo(() => {
    if (scope === 'match') return allMatchRallies ?? [];
    if (scopedSetId === currentSetId) return committedRallies;
    if (!scopedSetId) return [];
    return (allMatchRallies ?? []).filter(r => r.set_id === scopedSetId);
  }, [scope, scopedSetId, currentSetId, allMatchRallies, committedRallies]);

  const scopedSetNum = scope === 'match' ? setNumber : scope;

  // ── Scoped stats (all derived from scopedContacts / scopedRallies) ─────────
  const scopedPlayerStats = useMemo(
    () => computePlayerStats(scopedContacts, scopedSetNum, fullPositionMap),
    [scopedContacts, scopedSetNum, fullPositionMap]
  );
  const scopedTeamStats = useMemo(
    () => computeTeamStats(scopedContacts, scopedSetNum),
    [scopedContacts, scopedSetNum]
  );
  const scopedOppStats = useMemo(
    () => computeOppDisplayStats(scopedContacts),
    [scopedContacts]
  );
  const scopedPointQuality = useMemo(
    () => computePointQuality(scopedContacts),
    [scopedContacts]
  );

  function buildRotPts(rallies) {
    const raw = computeRotationStats(rallies ?? []);
    const result = {};
    for (let r = 1; r <= 6; r++) {
      const rot = raw.rotations[r] ?? {};
      const ptsWon   = (rot.so_win ?? 0) + (rot.bp_win ?? 0);
      const ptsLost  = (rot.so_opp ?? 0) - (rot.so_win ?? 0) + (rot.bp_opp ?? 0) - (rot.bp_win ?? 0);
      const ptsTotal = (rot.so_opp ?? 0) + (rot.bp_opp ?? 0);
      result[r] = {
        pts_won:   ptsWon,
        pts_lost:  ptsLost,
        pts_total: ptsTotal,
        win_pct:   ptsTotal > 0 ? ptsWon / ptsTotal : null,
        so_pct:    rot.so_pct ?? null,
        bp_pct:    rot.bp_pct ?? null,
      };
    }
    return result;
  }

  const scopedRotPts = useMemo(() => buildRotPts(scopedRallies), [scopedRallies]);
  const scopedRotContacts = useMemo(
    () => computeRotationContactStats(scopedContacts),
    [scopedContacts]
  );
  const scopedISvsOOS = useMemo(
    () => computeISvsOOS(scopedContacts, scopedRallies),
    [scopedContacts, scopedRallies]
  );
  const scopedFreeDigWin = useMemo(
    () => computeFreeDigWin(scopedContacts, scopedRallies),
    [scopedContacts, scopedRallies]
  );
  const scopedTransAtk = useMemo(
    () => computeTransitionAttack(scopedContacts, scopedRallies),
    [scopedContacts, scopedRallies]
  );
  const scopedServingPoints = useMemo(
    () => computeServingPoints(scopedRallies),
    [scopedRallies]
  );
  const xkByPlayer = useMemo(
    () => computeXKByPassRating(scopedContacts),
    [scopedContacts]
  );

  // Full-match stats kept for RecordsProgressPanel and OffenseBalanceChart comparison
  const matchPlayerStats = useMemo(
    () => computePlayerStats(allMatchContacts ?? [], setNumber, fullPositionMap),
    [allMatchContacts, setNumber, fullPositionMap]
  );
  const matchTeamStats = useMemo(
    () => computeTeamStats(allMatchContacts ?? [], setNumber),
    [allMatchContacts, setNumber]
  );
  const matchRotStats = useMemo(
    () => computeRotationStats(allMatchRallies ?? []),
    [allMatchRallies]
  );
  const matchISvsOOS = useMemo(
    () => computeISvsOOS(allMatchContacts ?? [], allMatchRallies ?? []),
    [allMatchContacts, allMatchRallies]
  );
  const matchPointQuality = useMemo(
    () => computePointQuality(allMatchContacts ?? []),
    [allMatchContacts]
  );

  // Opponent total points for PointQualityPanel
  const scopedOppTotal = useMemo(() => {
    if (scope === 'match') return (allMatchSets ?? []).reduce((sum, s) => sum + (s.opp_score ?? 0), 0);
    if (scope === setNumber) return oppScore;
    return (allMatchSets ?? []).find(s => s.set_number === scope)?.opp_score ?? 0;
  }, [scope, setNumber, oppScore, allMatchSets]);

  const serveZoneContacts = useMemo(
    () => scopedContacts.filter(c => c.action === 'serve' && c.zone != null),
    [scopedContacts]
  );

  // Score to display in the box header
  const boxScoreDisplay = useMemo(() => {
    if (scope === 'match') return { us: ourSetsWon, them: oppSetsWon, subtitle: 'Sets Won' };
    if (scope === setNumber) return { us: ourScore, them: oppScore, subtitle: `Set ${scope}` };
    const s = (allMatchSets ?? []).find(set => set.set_number === scope);
    return { us: s?.our_score ?? 0, them: s?.opp_score ?? 0, subtitle: `Set ${scope} Final` };
  }, [scope, setNumber, ourScore, oppScore, ourSetsWon, oppSetsWon, allMatchSets]);

  const scoreTimelineCharts = useMemo(() => {
    const rallies = allMatchRallies ?? [];
    const sets    = allMatchSets    ?? [];
    if (!rallies.length || !sets.length) return [];
    return [...sets]
      .filter(s => s.status !== 'scheduled')
      .sort((a, b) => a.set_number - b.set_number)
      .map(set => {
        const setRallies = rallies
          .filter(r => r.set_id === set.id)
          .sort((a, b) => a.rally_number - b.rally_number);
        if (!setRallies.length) return null;
        const pts = [{ x: 0, us: 0, opp: 0 }];
        let us = 0, opp = 0;
        for (const r of setRallies) {
          if (r.point_winner === 'us') us++;
          else opp++;
          pts.push({ x: pts.length, us, opp });
        }
        const maxScore = Math.max(...pts.map(d => Math.max(d.us, d.opp)), 1);
        return { set, pts, maxScore };
      })
      .filter(Boolean);
  }, [allMatchRallies, allMatchSets]);

  const rows = useMemo(() => {
    const lineupMap = Object.fromEntries(
      lineup.filter(sl => sl.playerId).map(sl => [sl.playerId, sl.playerName])
    );
    const allIds = new Set([
      ...Object.keys(lineupMap).map(Number),
      ...Object.keys(scopedPlayerStats).map(Number),
    ]);
    return [...allIds]
      .map(pid => ({
        id:     pid,
        name:   lineupMap[pid] ?? nameMap[String(pid)] ?? `#${pid}`,
        ...(scopedPlayerStats[pid] ?? {}),
        srv_pt: scopedServingPoints[pid] ?? 0,
      }))
      .sort((a, b) => {
        const aActive = !!lineupMap[a.id];
        const bActive = !!lineupMap[b.id];
        if (aActive !== bActive) return aActive ? -1 : 1;
        return (a.name ?? '').localeCompare(b.name ?? '');
      });
  }, [lineup, scopedPlayerStats, scopedServingPoints, nameMap]);

  if (!open) return null;

  const activeColumns = activeTab === 'SERVING' ? SERVING_COLS[serveView] : COLUMNS[activeTab] ?? [];
  const maxSets = format === 'best_of_5' ? 5 : 3;

  // Scope toggle — shared between box and stats views
  const ScopeToggle = () => (
    <div className="flex gap-2 px-3 py-2 border-b border-slate-800 bg-black/20 flex-shrink-0">
      {availableSets.map(s => (
        <button
          key={s.set_number}
          onPointerDown={(e) => { e.preventDefault(); setScope(s.set_number); }}
          className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
            scope === s.set_number
              ? 'bg-primary text-white'
              : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
          }`}
        >
          S{s.set_number}
        </button>
      ))}
      <button
        onPointerDown={(e) => { e.preventDefault(); setScope('match'); }}
        className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
          scope === 'match'
            ? 'bg-primary text-white'
            : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
        }`}
      >
        MATCH
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <span className="text-white font-bold text-lg tracking-wide">
          LIVE STATS · Set {setNumber}
        </span>
        <button
          onPointerDown={(e) => { e.preventDefault(); onClose(); }}
          className="text-slate-400 hover:text-white text-2xl leading-none"
        >
          ✕
        </button>
      </div>

      {/* Top-level tab bar */}
      <div className="flex border-b border-slate-700 flex-shrink-0">
        {[['box', 'BOX SCORE'], ['insights', 'INSIGHTS'], ['stats', 'STATS']].map(([key, label]) => (
          <button
            key={key}
            onPointerDown={(e) => { e.preventDefault(); setActiveView(key); }}
            className={`flex-1 py-2.5 text-sm font-bold tracking-wide ${
              activeView === key
                ? 'text-primary border-b-2 border-primary'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">

        {activeView === 'insights' ? (
          <div className="p-4 space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-xs font-black tracking-widest text-slate-500 uppercase">Live Insights</p>
              {winCorr && (
                <p className="text-[10px] text-slate-600">{winCorr.win.matches}W · {winCorr.loss.matches}L baseline</p>
              )}
            </div>

            {INSIGHT_METRICS.map(({ label, key, src, fmt, higherBetter }) => {
              const pickLive = () => {
                if (src === 'rot')   return matchRotStats?.[key];
                if (src === 'isOos') return matchISvsOOS?.total?.is?.[key];
                if (src === 'pq')    return matchPointQuality?.[key];
                return matchTeamStats?.[key];
              };
              const pickCorr = (d) => {
                if (src === 'rot')   return d?.rotation?.[key];
                if (src === 'isOos') return d?.isOos?.total?.is?.[key];
                if (src === 'pq')    return d?.pointQuality?.[key];
                return d?.team?.[key];
              };

              const nowVal  = pickLive();
              const winVal  = winCorr ? pickCorr(winCorr.win)  : null;
              const lossVal = winCorr ? pickCorr(winCorr.loss) : null;

              const hasCorr = winVal != null && lossVal != null;
              const wv = hasCorr ? (higherBetter ? winVal  : -winVal)  : null;
              const lv = hasCorr ? (higherBetter ? lossVal : -lossVal) : null;
              const nv = nowVal != null && hasCorr ? (higherBetter ? nowVal : -nowVal) : null;
              const range  = hasCorr ? wv - lv : null;
              const pos    = nv != null && range !== 0 ? (nv - lv) / range : null;
              const barPct = pos != null ? Math.max(0, Math.min(100, Math.round(pos * 100))) : null;

              const statusColor = pos == null ? 'text-primary'
                : pos >= 0.65 ? 'text-emerald-400'
                : pos >= 0.35 ? 'text-amber-400'
                : 'text-red-400';
              const statusLabel = pos == null ? null
                : pos >= 0.65 ? '✓ On track'
                : pos >= 0.35 ? '⚡ Watch this'
                : '✗ Below avg';

              return (
                <div key={key} className="bg-slate-800 rounded-xl p-3 border border-slate-700/40">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-black uppercase tracking-wide text-slate-400">{label}</span>
                    {statusLabel && <span className={`text-[11px] font-bold ${statusColor}`}>{statusLabel}</span>}
                  </div>

                  {hasCorr ? (
                    <>
                      <div className="flex items-end gap-3 mb-2">
                        <div className="flex-1 text-center">
                          <div className="text-base font-black text-red-400 tabular-nums leading-none">{fmt(lossVal)}</div>
                          <div className="text-[9px] text-red-900 font-bold mt-0.5 tracking-wide">LOSS AVG</div>
                        </div>
                        <div className="flex-1 text-center">
                          <div className={`text-2xl font-black tabular-nums leading-none ${statusColor}`}>{nowVal != null ? fmt(nowVal) : '—'}</div>
                          <div className="text-[9px] text-slate-500 font-bold mt-0.5 tracking-wide">THIS MATCH</div>
                        </div>
                        <div className="flex-1 text-center">
                          <div className="text-base font-black text-emerald-400 tabular-nums leading-none">{fmt(winVal)}</div>
                          <div className="text-[9px] text-emerald-700 font-bold mt-0.5 tracking-wide">WIN AVG</div>
                        </div>
                      </div>
                      {barPct != null && (
                        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-[width] duration-700 ease-out ${
                              barPct >= 65 ? 'bg-emerald-500' : barPct >= 35 ? 'bg-amber-500' : 'bg-red-500'
                            }`}
                            style={{ width: barsReady ? `${barPct}%` : '0%' }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`text-2xl font-black tabular-nums leading-none ${statusColor}`}>
                      {nowVal != null ? fmt(nowVal) : '—'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : activeView === 'box' ? (
          <>
            <ScopeToggle />

            {/* Score header */}
            <div className="flex items-center justify-center gap-6 px-4 py-4">
              <div className="text-center min-w-[4rem]">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                  {teamName || 'HOME'}
                </div>
                <div className="text-5xl font-black tabular-nums text-white">{boxScoreDisplay.us}</div>
              </div>
              <div className="text-center">
                <div className="text-slate-400 text-base font-bold">{ourSetsWon} – {oppSetsWon}</div>
                <div className="text-slate-600 text-xs mt-0.5">{boxScoreDisplay.subtitle}</div>
              </div>
              <div className="text-center min-w-[4rem]">
                <div className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-1">
                  {opponentName || 'AWAY'}
                </div>
                <div className="text-5xl font-black tabular-nums text-slate-300">{boxScoreDisplay.them}</div>
              </div>
            </div>

            {/* Set scores strip */}
            <div className="border-t border-slate-800">
              <SetScoresStrip
                allMatchSets={allMatchSets}
                currentSetNumber={setNumber}
                ourScore={ourScore}
                oppScore={oppScore}
              />
            </div>

            {/* Sparkline — always shows current set momentum */}
            <div className="border-t border-slate-800 py-2">
              <BoxSparkline pointHistory={pointHistory} />
            </div>

            {/* Team stats */}
            <div className="border-t border-slate-800">
              <TeamStatsTable t={scopedTeamStats} opp={scopedOppStats} />
            </div>

            {/* Rotation analysis */}
            <div className="border-t border-slate-800">
              <RotationTable rotPts={scopedRotPts} rotContacts={scopedRotContacts} />
            </div>

            {/* In-System / Out-of-System */}
            <div className="border-t border-slate-800">
              <ISvsOOSTable
                data={scopedISvsOOS ?? EMPTY_ISVSOOS}
                freeDigData={scopedFreeDigWin ?? EMPTY_FREEDIG}
                transAtkData={scopedTransAtk ?? EMPTY_TRANSATK}
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col h-full">
            {/* Stats detail tab bar */}
            <div className="flex border-b border-slate-700 flex-shrink-0">
              <button
                onPointerDown={(e) => { e.preventDefault(); setActiveView('box'); }}
                className="px-3 py-2 text-xs font-bold text-slate-400 hover:text-white border-r border-slate-700 flex-shrink-0"
              >
                ◂ BOX
              </button>
              {TABS.map((tab) => (
                <button
                  key={tab}
                  onPointerDown={(e) => { e.preventDefault(); setActiveTab(tab); }}
                  className={`flex-1 py-2 text-xs font-semibold tracking-wide relative ${
                    activeTab === tab
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab}
                  {tab === 'RECORDS' && recordAlerts.length > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-yellow-500 text-black text-[9px] font-black flex items-center justify-center leading-none">
                      {recordAlerts.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Scope toggle */}
            {activeTab !== 'RECORDS' && activeTab !== 'ROTATION' && <ScopeToggle />}

            {/* Serve sub-toggle */}
            {activeTab === 'SERVING' && (
              <div className="flex gap-1 px-3 py-2 border-b border-slate-800 bg-black/20 flex-shrink-0">
                {SERVE_VIEWS.map((v) => (
                  <button
                    key={v}
                    onPointerDown={(e) => { e.preventDefault(); setServeView(v); }}
                    className={`flex-1 py-1 rounded text-xs font-bold transition-colors ${
                      serveView === v
                        ? 'bg-slate-600 text-white'
                        : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    {v === 'TOP' ? 'TOP SPIN' : v}
                  </button>
                ))}
              </div>
            )}

            {/* Detail content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'POINTS'
                ? <div className="p-4 space-y-4">
                    <PointQualityPanel
                      pq={scopedPointQuality}
                      oppScored={scopedOppTotal}
                    />
                    {scoreTimelineCharts.length > 0 && (
                      <div className="space-y-4">
                        <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Score Timeline</p>
                        <div className="flex gap-4">
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <span className="inline-block w-4 h-0.5 bg-orange-400 rounded" />
                            {teamName || 'Us'}
                          </span>
                          <span className="flex items-center gap-1 text-xs text-slate-400">
                            <span className="inline-block w-4 h-0.5 bg-slate-400 rounded" />
                            {opponentName || 'Opp'}
                          </span>
                        </div>
                        {scoreTimelineCharts
                          .filter(c => scope === 'match' || c.set.set_number === scope)
                          .map(({ set, pts, maxScore }) => (
                          <div key={set.id}>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Set {set.set_number}</p>
                            <ResponsiveContainer width="100%" height={130}>
                              <LineChart data={pts} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                                <XAxis dataKey="x" hide />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} domain={[0, 25]} ticks={[5, 10, 15, 20, 25]} interval={0} allowDecimals={false} />
                                <Tooltip
                                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                                  labelStyle={{ color: '#cbd5e1' }}
                                  formatter={(val, name) => [val, name === 'us' ? (teamName || 'Us') : (opponentName || 'Opp')]}
                                  labelFormatter={() => ''}
                                />
                                <Line type="monotone" dataKey="us"  stroke="#f97316" strokeWidth={2} dot={false} name="us" />
                                <Line type="monotone" dataKey="opp" stroke="#94a3b8" strokeWidth={2} dot={false} name="opp" />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                : activeTab === 'ROTATION'
                ? (() => {
                    const liveRot = computeRotationStats(committedRallies);
                    const FLAG_DELTA = 0.10;
                    const MIN_OPP   = 3;
                    const rotNums   = [1, 2, 3, 4, 5, 6];

                    const flags = rotNums.filter((n) => {
                      const live   = liveRot.rotations?.[n];
                      const season = seasonRotation?.rotations?.[n];
                      if (!live || !season || live.so_opp < MIN_OPP) return false;
                      return (live.so_pct ?? 0) < (season.so_pct ?? 0) - FLAG_DELTA;
                    });

                    const pct = (v) => v != null ? `${Math.round(v * 100)}%` : '—';

                    return (
                      <div className="px-4 py-3 space-y-3">
                        {/* Alert banners for flagged rotations */}
                        {flags.length > 0 && (
                          <div className="space-y-1.5">
                            {flags.map((n) => {
                              const live   = liveRot.rotations[n];
                              const season = seasonRotation.rotations[n];
                              return (
                                <div key={n} className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-amber-900/30 border border-amber-600/50">
                                  <span className="text-amber-400 text-base leading-none mt-0.5">⚠</span>
                                  <div>
                                    <p className="text-xs font-black text-amber-300">
                                      Rotation {n} — {live.so_win}/{live.so_opp} sideouts ({pct(live.so_pct)})
                                    </p>
                                    <p className="text-[11px] text-amber-600 mt-0.5">
                                      Season avg {pct(season.so_pct)} — consider timeout or sub
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {flags.length === 0 && (
                          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-900/20 border border-emerald-800/40">
                            <span className="text-emerald-400 text-sm">✓</span>
                            <span className="text-xs text-emerald-500 font-semibold">All rotations tracking at or above season averages</span>
                          </div>
                        )}

                        {/* Per-rotation comparison table */}
                        <div className="bg-slate-800/50 rounded-xl overflow-hidden">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-slate-700">
                                <th className="px-3 py-2 text-left font-bold text-slate-400">ROT</th>
                                <th className="px-2 py-2 text-right font-bold text-slate-400">SO%</th>
                                <th className="px-2 py-2 text-right font-bold text-slate-400">SZN SO%</th>
                                <th className="px-2 py-2 text-right font-bold text-slate-400">Δ</th>
                                <th className="px-2 py-2 text-right font-bold text-slate-400">BP%</th>
                                <th className="px-2 py-2 text-right font-bold text-slate-400">SZN BP%</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rotNums.map((n) => {
                                const live   = liveRot.rotations?.[n];
                                const season = seasonRotation?.rotations?.[n];
                                const soLive = live?.so_pct ?? null;
                                const soSzn  = season?.so_pct ?? null;
                                const delta  = soLive != null && soSzn != null ? soLive - soSzn : null;
                                const isFlagged = flags.includes(n);
                                const noData = !live || live.so_opp === 0;
                                const deltaColor = delta == null ? 'text-slate-600'
                                  : delta >= 0    ? 'text-emerald-400'
                                  : delta >= -0.05 ? 'text-amber-400'
                                  : 'text-red-400';
                                return (
                                  <tr key={n} className={`border-b border-slate-800/60 ${isFlagged ? 'bg-amber-900/10' : n % 2 === 0 ? 'bg-slate-900/20' : ''}`}>
                                    <td className="px-3 py-2 font-black text-slate-200">
                                      R{n} {isFlagged && <span className="text-amber-400 text-[10px]">⚠</span>}
                                    </td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-200">
                                      {noData ? <span className="text-slate-600">—</span> : pct(soLive)}
                                    </td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-400">{pct(soSzn)}</td>
                                    <td className={`px-2 py-2 text-right font-black ${deltaColor}`}>
                                      {delta == null ? '—' : `${delta >= 0 ? '+' : ''}${Math.round(delta * 100)}%`}
                                    </td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-200">
                                      {noData ? <span className="text-slate-600">—</span> : pct(live?.bp_pct)}
                                    </td>
                                    <td className="px-2 py-2 text-right font-mono text-slate-400">{pct(season?.bp_pct)}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                        {!seasonRotation && (
                          <p className="text-[11px] text-slate-600 text-center">Season baseline not available — SZN columns will populate after first match.</p>
                        )}
                      </div>
                    );
                  })()
                : activeTab === 'RECORDS'
                ? <RecordsProgressPanel
                    records={records}
                    playerStats={matchPlayerStats}
                    teamStats={matchTeamStats}
                    lineup={lineup}
                    roster={roster}
                  />
                : (
                  <>
                    <StatTable columns={activeColumns} rows={rows} />
                    {activeTab === 'SERVING' && (
                      <ServeZoneStatsPanel contacts={serveZoneContacts} />
                    )}
                    {activeTab === 'ATTACKING' && (
                      <div className="border-t border-slate-800">
                        <OffenseBalanceChart
                          setPlayerStats={scopedPlayerStats}
                          matchPlayerStats={matchPlayerStats}
                          positionMap={fullPositionMap}
                        />
                        {(() => {
                          const xkRows = Object.entries(xkByPlayer)
                            .filter(([, x]) => (x.xk1_ta ?? 0) > 0 || (x.xk2_ta ?? 0) > 0 || (x.xk3_ta ?? 0) > 0)
                            .map(([pid, x]) => ({ pid, name: nameMap[pid] ?? `#${pid}`, ...x }));
                          if (!xkRows.length) return null;
                          const cell = 'px-2 py-1.5 text-right tabular-nums text-slate-300';
                          return (
                            <div className="px-4 pb-4 space-y-3">
                              <div className="bg-slate-800/60 rounded-xl p-3">
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Kill% by Pass Rating (xK%)</p>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-700">
                                      <th className="px-2 py-1.5 text-left font-semibold text-slate-400">Player</th>
                                      <th className="px-2 py-1.5 text-right font-semibold text-slate-400">xK1%</th>
                                      <th className="px-2 py-1.5 text-right font-semibold text-slate-400">xK2%</th>
                                      <th className="px-2 py-1.5 text-right font-semibold text-slate-400">xK3%</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {xkRows.map((r, i) => (
                                      <tr key={r.pid} className={`border-b border-slate-800/60 ${i % 2 !== 0 ? 'bg-slate-900/30' : ''}`}>
                                        <td className="px-2 py-1.5 text-slate-300">{r.name}</td>
                                        <td className={cell}>{fmtPct(r.xk1)}</td>
                                        <td className={cell}>{fmtPct(r.xk2)}</td>
                                        <td className={cell}>{fmtPct(r.xk3)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              <div className="bg-slate-800/60 rounded-xl p-3">
                                <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-2">Hit% by Pass Rating (xHIT%)</p>
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-700">
                                      <th className="px-2 py-1.5 text-left font-semibold text-slate-400">Player</th>
                                      <th className="px-2 py-1.5 text-right font-semibold text-slate-400">xHIT1</th>
                                      <th className="px-2 py-1.5 text-right font-semibold text-slate-400">xHIT2</th>
                                      <th className="px-2 py-1.5 text-right font-semibold text-slate-400">xHIT3</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {xkRows.map((r, i) => (
                                      <tr key={r.pid} className={`border-b border-slate-800/60 ${i % 2 !== 0 ? 'bg-slate-900/30' : ''}`}>
                                        <td className="px-2 py-1.5 text-slate-300">{r.name}</td>
                                        <td className={cell}>{fmtHitting(r.xhit1)}</td>
                                        <td className={cell}>{fmtHitting(r.xhit2)}</td>
                                        <td className={cell}>{fmtHitting(r.xhit3)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </>
                )
              }
            </div>
          </div>
        )}

      </div>
    </div>
  );
});
