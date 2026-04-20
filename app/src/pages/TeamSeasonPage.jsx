import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts';
import { db } from '../db/schema';
import { computeTeamStats, computePointQuality } from '../stats/engine';
import { getContactsForMatches, getBatchSetsPlayedCount } from '../stats/queries';
import { PageHeader } from '../components/layout/PageHeader';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtVal(val, decimals = 0) {
  if (val == null || isNaN(val)) return '—';
  return decimals > 0 ? Number(val).toFixed(decimals) : String(Math.round(val));
}

function fmtPct(val) {
  if (val == null || isNaN(val)) return '—';
  return (val * 100).toFixed(1) + '%';
}

function fmtHit(val) {
  if (val == null || isNaN(val)) return '—';
  const s = (val * 1000).toFixed(0);
  return (val >= 0 ? '' : '') + (val * 1000 >= 0 ? '.' : '-.') + Math.abs(Number(s)).toString().padStart(3, '0');
}

function oppLabel(match) {
  if (match.opponent_abbr) return match.opponent_abbr;
  const name = match.opponent_name ?? '';
  return name.length > 5 ? name.slice(0, 4).toUpperCase() : name.toUpperCase() || '?';
}

// ── per-match team stats ──────────────────────────────────────────────────────

function buildMatchStats(match, contacts, setsCount) {
  const mc = contacts.filter(c => c.match_id === match.id);
  const ts = computeTeamStats(mc, setsCount);
  const pq = computePointQuality(mc);
  return {
    opp:     oppLabel(match),
    oppFull: match.opponent_name ?? '',
    date:    match.date,
    sets:    setsCount,
    k:       ts.k       ?? 0,
    ace:     ts.ace     ?? 0,
    blk:     (ts.bs ?? 0) + (ts.ba ?? 0),
    dig:     ts.dig     ?? 0,
    ast:     ts.ast     ?? 0,
    rec:     ts.pa      ?? 0,
    apr:     ts.apr     ?? null,
    earned:  pq.earned.total,
    free:    pq.free.total,
    given:   pq.given.total,
    si_pct:  ts.si_pct  != null ? ts.si_pct  * 100 : null,
    ace_pct: ts.ace_pct != null ? ts.ace_pct * 100 : null,
    hit_pct: ts.hit_pct != null ? ts.hit_pct * 100 : null,
    k_pct:   ts.k_pct   != null ? ts.k_pct   * 100 : null,
  };
}

// ── chart config ──────────────────────────────────────────────────────────────

const CHARTS = [
  { key: 'k',       label: 'Kills',       decimals: 0, isCount: true,  color: '#f97316' },
  { key: 'ace',     label: 'Aces',        decimals: 0, isCount: true,  color: '#22d3ee' },
  { key: 'blk',     label: 'Blocks',      decimals: 0, isCount: true,  color: '#a78bfa' },
  { key: 'dig',     label: 'Digs',        decimals: 0, isCount: true,  color: '#4ade80' },
  { key: 'ast',     label: 'Assists',     decimals: 0, isCount: true,  color: '#fb7185' },
  { key: 'rec',     label: 'Receptions',  decimals: 0, isCount: true,  color: '#fbbf24' },
  { key: 'earned',  label: 'Earned',      decimals: 0, isCount: true,  color: '#22c55e' },
  { key: 'free',    label: 'Free',        decimals: 0, isCount: true,  color: '#38bdf8' },
  { key: 'given',   label: 'Given',       decimals: 0, isCount: true,  color: '#f87171' },
  { key: 'apr',     label: 'Pass Rating', decimals: 2, isCount: false, color: '#60a5fa', domain: [1, 3] },
  { key: 'si_pct',  label: 'Serve%',      decimals: 1, isCount: false, color: '#2dd4bf', domain: [50, 100] },
  { key: 'ace_pct', label: 'Ace%',        decimals: 1, isCount: false, color: '#67e8f9', domain: [0, 30] },
  { key: 'hit_pct', label: 'Hit%',        decimals: 1, isCount: false, color: '#fb923c' },
  { key: 'k_pct',   label: 'K%',          decimals: 1, isCount: false, color: '#fde68a', domain: [0, 100] },
];

const COUNT_KEYS = ['k', 'ace', 'blk', 'dig', 'ast', 'rec', 'earned', 'free', 'given'];

// ── custom tooltip ────────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label, decimals }) {
  if (!active || !payload?.length) return null;
  const val = payload[0]?.value;
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-slate-400 mb-0.5">{payload[0]?.payload?.oppFull || label}</p>
      <p className="font-bold text-white">{val != null ? (decimals > 0 ? Number(val).toFixed(decimals) : Math.round(val)) : '—'}</p>
    </div>
  );
}

// ── summary tile ──────────────────────────────────────────────────────────────

function StatTile({ label, value }) {
  return (
    <div className="bg-surface rounded-xl p-2 text-center flex flex-col items-center gap-1">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">{label}</span>
      <span className="text-xl font-black text-slate-300 tabular-nums leading-none">{value}</span>
    </div>
  );
}

// ── trend chart ───────────────────────────────────────────────────────────────

function linearRegression(data, key) {
  const pts = data.map((d, i) => [i, d[key]]).filter(([, y]) => y != null && !isNaN(y));
  if (pts.length < 2) return null;
  const n   = pts.length;
  const sumX  = pts.reduce((a, [x]) => a + x, 0);
  const sumY  = pts.reduce((a, [, y]) => a + y, 0);
  const sumXY = pts.reduce((a, [x, y]) => a + x * y, 0);
  const sumX2 = pts.reduce((a, [x]) => a + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return null;
  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;
  return data.map((_, i) => m * i + b);
}

function TrendChart({ data, chartKey, label, decimals, color, domain }) {
  const tickFormatter = decimals > 0
    ? (v) => Number(v).toFixed(decimals)
    : (v) => String(Math.round(v));

  const chartData = useMemo(() => {
    const trend = linearRegression(data, chartKey);
    if (!trend) return data;
    return data.map((d, i) => ({ ...d, _trend: trend[i] }));
  }, [data, chartKey]);

  const hasTrend = chartData[0]?._trend != null;

  return (
    <div className="space-y-1">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-400 px-1">{label}</p>
      <ResponsiveContainer width="100%" height={420}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis
            dataKey="opp"
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            angle={-30}
            textAnchor="end"
            interval={0}
          />
          <YAxis
            tick={{ fill: '#94a3b8', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={tickFormatter}
            width={36}
            domain={domain ?? ['auto', 'auto']}
          />
          <Tooltip content={<ChartTooltip decimals={decimals} />} />
          {hasTrend && (
            <Line
              type="linear"
              dataKey="_trend"
              stroke="#64748b"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              activeDot={false}
              legendType="none"
              connectNulls
            />
          )}
          <Line
            type="monotone"
            dataKey={chartKey}
            stroke={color}
            strokeWidth={2}
            dot={{ r: 3, fill: color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── page ──────────────────────────────────────────────────────────────────────

export function TeamSeasonPage() {
  const { seasonId } = useParams();
  const id = Number(seasonId);

  const [activeStat, setActiveStat] = useState('k');
  const [graphScope, setGraphScope] = useState('match');
  const [loading, setLoading] = useState(false);
  const [matchStats, setMatchStats] = useState(null); // [{ opp, k, ace, ... }]
  const [seasonTotals, setSeasonTotals] = useState(null);

  const season = useLiveQuery(() => db.seasons.get(id), [id]);
  const team   = useLiveQuery(
    () => season ? db.teams.get(season.team_id) : null,
    [season?.team_id]
  );

  const matches = useLiveQuery(
    () =>
      season
        ? db.matches
            .where('season_id').equals(id)
            .filter(m => m.status !== 'scheduled' && m.match_type !== 'exhibition')
            .sortBy('date')
        : Promise.resolve([]),
    [id, season?.id]
  );

  useEffect(() => {
    if (!matches?.length) {
      setMatchStats([]);
      setSeasonTotals(null);
      return;
    }
    setLoading(true);
    const matchIds = matches.map(m => m.id);
    Promise.all([
      getContactsForMatches(matchIds),
      getBatchSetsPlayedCount(matchIds),
    ])
      .then(([contacts, setsPerMatch]) => {
        const sorted = [...matches].sort((a, b) => {
          if (!a.date && !b.date) return 0;
          if (!a.date) return 1;
          if (!b.date) return -1;
          return a.date.localeCompare(b.date);
        });

        const perMatch = sorted.map(m =>
          buildMatchStats(m, contacts, setsPerMatch[m.id] ?? 1)
        );

        const totalSets = Object.values(setsPerMatch).reduce((s, v) => s + v, 0);
        const totals = computeTeamStats(contacts, Math.max(1, totalSets));

        setMatchStats(perMatch);
        setSeasonTotals(totals);
      })
      .finally(() => setLoading(false));
  }, [matches]); // eslint-disable-line react-hooks/exhaustive-deps

  // W–L record from completed matches
  const record = useMemo(() => {
    if (!matches?.length) return null;
    const completed = matches.filter(m => m.status === 'complete');
    if (!completed.length) return null;
    const w = completed.filter(m => (m.our_sets_won ?? 0) > (m.opp_sets_won ?? 0)).length;
    const l = completed.length - w;
    return `${w}–${l}`;
  }, [matches]);

  const perSetData = useMemo(() =>
    matchStats?.map(d => ({
      ...d,
      ...Object.fromEntries(COUNT_KEYS.map(key => [key, d.sets > 0 ? d[key] / d.sets : null])),
    })) ?? [],
  [matchStats]);

  if (!season || !team) {
    return <div className="flex items-center justify-center h-48"><Spinner /></div>;
  }

  const title = (
    <span className="flex flex-col leading-tight">
      <span className="font-bold">{team.name}</span>
      <span className="text-sm font-normal text-slate-400">{season.name}</span>
    </span>
  );

  const recordBadge = record ? (
    <span className="text-sm font-semibold text-slate-300 bg-slate-800 rounded-lg px-2 py-1">{record}</span>
  ) : null;

  return (
    <div className="pb-8">
      <PageHeader
        title={title}
        backTo={`/seasons/${id}`}
        action={recordBadge}
      />

      {loading && (
        <div className="flex items-center justify-center h-48"><Spinner /></div>
      )}

      {!loading && (!matchStats?.length) && (
        <div className="px-4 pt-8">
          <EmptyState message="No completed matches this season yet." />
        </div>
      )}

      {!loading && matchStats?.length > 0 && seasonTotals && (
        <div className="px-4 pt-4 space-y-6">

          {/* ── Season Totals ── */}
          <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">Season Totals</p>
            <div className="grid grid-cols-5 gap-2">
              <StatTile label="K"    value={fmtVal(seasonTotals.k)} />
              <StatTile label="ACE"  value={fmtVal(seasonTotals.ace)} />
              <StatTile label="BLK"  value={fmtVal((seasonTotals.bs ?? 0) + (seasonTotals.ba ?? 0))} />
              <StatTile label="DIG"  value={fmtVal(seasonTotals.dig)} />
              <StatTile label="AST"  value={fmtVal(seasonTotals.ast)} />
            </div>
            <div className="grid grid-cols-5 gap-2">
              <StatTile label="REC"  value={fmtVal(seasonTotals.pa)} />
              <StatTile label="APR"  value={fmtVal(seasonTotals.apr, 2)} />
              <StatTile label="HIT%" value={fmtHit(seasonTotals.hit_pct)} />
              <StatTile label="SI%"  value={fmtPct(seasonTotals.si_pct)} />
              <StatTile label="ACE%" value={fmtPct(seasonTotals.ace_pct)} />
            </div>
          </div>

          {/* ── Trend Chart ── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
                {graphScope === 'set' ? 'Per-Set Trends' : 'Per-Match Trends'}
              </p>
              <div className="flex gap-1">
                {['match', 'set'].map(s => (
                  <button
                    key={s}
                    onPointerDown={e => { e.preventDefault(); setGraphScope(s); }}
                    className={`px-2.5 py-0.5 rounded text-[10px] font-bold transition-colors ${
                      graphScope === s ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-500 hover:bg-slate-700'
                    }`}
                  >
                    {s === 'match' ? 'PER MATCH' : 'PER SET'}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {CHARTS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setActiveStat(key)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors
                    ${activeStat === key
                      ? 'bg-primary text-white'
                      : 'bg-surface text-slate-400 hover:text-slate-200'
                    }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {(() => {
              const chart = CHARTS.find(c => c.key === activeStat);
              if (!chart) return null;
              const chartData = graphScope === 'set' ? perSetData : matchStats;
              const decimals  = (graphScope === 'set' && chart.isCount) ? 1 : chart.decimals;
              return (
                <TrendChart
                  data={chartData}
                  chartKey={chart.key}
                  label={chart.label}
                  decimals={decimals}
                  color={chart.color}
                  domain={chart.domain}
                />
              );
            })()}
          </div>

        </div>
      )}
    </div>
  );
}
