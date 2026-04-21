import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  PolarRadiusAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { db } from '../db/schema';
import { computePlayerStats, computePlayerTrends, computeTeamStats } from '../stats/engine';
import {
  getContactsForMatches,
  getBatchSetsPlayedCount,
  getPlayerPositionsForMatches,
  getOurScoredForMatches,
  getOppScoredForMatches,
} from '../stats/queries';
import { TAB_COLUMNS, SERVING_COLS } from '../stats/columns';
import { fmtCount, fmtHitting, fmtPassRating, fmtPct, fmtVER } from '../stats/formatters';
import { PageHeader } from '../components/layout/PageHeader';
import { TabBar } from '../components/ui/Tab';
import { StatTable } from '../components/stats/StatTable';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { Badge } from '../components/ui/Badge';
import { VER_TIERS } from '../components/stats/VERBadge';

const POS_COLOR = { S: 'blue', OH: 'orange', OPP: 'orange', MB: 'green', L: 'gray', DS: 'gray', RS: 'orange' };

// ── Per-game trend chart ──────────────────────────────────────────────────────

function calcLinearTrend(data, key) {
  const pts = data.map((d, i) => [i, d[key]]).filter(([, y]) => y != null);
  if (pts.length < 2) return null;
  const n    = pts.length;
  const sumX  = pts.reduce((s, [x])    => s + x,     0);
  const sumY  = pts.reduce((s, [, y])  => s + y,     0);
  const sumXY = pts.reduce((s, [x, y]) => s + x * y, 0);
  const sumX2 = pts.reduce((s, [x])    => s + x * x, 0);
  const denom = n * sumX2 - sumX * sumX;
  if (!denom) return null;
  const m = (n * sumXY - sumX * sumY) / denom;
  const b = (sumY - m * sumX) / n;
  return (i) => m * i + b;
}

const TREND_OPTS = {
  serving: {
    all:   [
      { key: 'ace',     label: 'ACE',  color: '#22c55e' },
      { key: 'se',      label: 'SE',   color: '#ef4444' },
      { key: 'sa',      label: 'SA',   color: '#94a3b8' },
      { key: 'ace_pct', label: 'ACE%', color: '#f97316', fmt: fmtPct },
      { key: 'si_pct',  label: 'SI%',  color: '#38bdf8', fmt: fmtPct },
    ],
    float: [
      { key: 'f_ace',     label: 'ACE',  color: '#22c55e' },
      { key: 'f_se',      label: 'SE',   color: '#ef4444' },
      { key: 'f_sa',      label: 'SA',   color: '#94a3b8' },
      { key: 'f_ace_pct', label: 'ACE%', color: '#f97316', fmt: fmtPct },
      { key: 'f_si_pct',  label: 'SI%',  color: '#38bdf8', fmt: fmtPct },
    ],
    top: [
      { key: 't_ace',     label: 'ACE',  color: '#22c55e' },
      { key: 't_se',      label: 'SE',   color: '#ef4444' },
      { key: 't_sa',      label: 'SA',   color: '#94a3b8' },
      { key: 't_ace_pct', label: 'ACE%', color: '#f97316', fmt: fmtPct },
      { key: 't_si_pct',  label: 'SI%',  color: '#38bdf8', fmt: fmtPct },
    ],
  },
  passing: [
    { key: 'apr', label: 'APR',  color: '#f97316', fmt: v => Number(v).toFixed(2) },
    { key: 'pa',  label: 'PA',   color: '#94a3b8' },
    { key: 'p3',  label: 'P3',   color: '#22c55e' },
    { key: 'p0',  label: 'P0',   color: '#ef4444' },
  ],
  attacking: [
    { key: 'k',       label: 'K',    color: '#22c55e' },
    { key: 'ae',      label: 'AE',   color: '#ef4444' },
    { key: 'ta',      label: 'ATT',  color: '#94a3b8' },
    { key: 'hit_pct', label: 'HIT%', color: '#f97316', fmt: fmtHitting },
  ],
  blocking: [
    { key: 'blks', label: 'BLK',  color: '#a78bfa' },
    { key: 'bs',   label: 'Solo', color: '#7c3aed' },
    { key: 'ba',   label: 'Ast',  color: '#c4b5fd' },
  ],
  setting: [
    { key: 'ast', label: 'AST', color: '#38bdf8' },
    { key: 'bhe', label: 'BHE', color: '#ef4444' },
  ],
  defense: [
    { key: 'dig', label: 'DIG', color: '#34d399' },
    { key: 'de',  label: 'DE',  color: '#ef4444' },
  ],
  ver: [
    { key: 'ver', label: 'VER', color: '#f97316', fmt: fmtVER },
  ],
};

function PerGameTrendGraph({ rows, statTab, serveView }) {
  const opts = statTab === 'serving'
    ? (TREND_OPTS.serving[serveView] ?? TREND_OPTS.serving.all)
    : (TREND_OPTS[statTab] ?? []);

  const [selectedKey, setSelectedKey] = useState(opts[0]?.key ?? null);

  if (!opts.length || !rows.length) return null;

  const sel = opts.find(o => o.key === selectedKey) ?? opts[0];

  const baseData = rows.map(r => ({
    label: r.oppAbbr || r.date,
    opp:   r.opp,
    [sel.key]: r[sel.key] ?? null,
  }));

  const hasData = baseData.some(d => d[sel.key] != null && d[sel.key] !== 0);
  if (!hasData) return null;

  const trendFn  = calcLinearTrend(baseData, sel.key);
  const chartData = trendFn
    ? baseData.map((d, i) => ({ ...d, _trend: trendFn(i) }))
    : baseData;

  return (
    <div className="mx-4 mb-3 bg-surface rounded-xl p-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Per Game Trend</p>
      <div className="flex gap-1.5 flex-wrap mb-3">
        {opts.map(o => (
          <button
            key={o.key}
            onClick={() => setSelectedKey(o.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${
              sel.key === o.key ? 'text-white' : 'bg-slate-700 text-slate-400 hover:text-white'
            }`}
            style={sel.key === o.key ? { background: o.color } : undefined}
          >
            {o.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="label" tick={{ fill: '#64748b', fontSize: 10 }} tickLine={false} axisLine={false} />
          <YAxis domain={['auto', 'auto']} tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
            labelFormatter={(_, payload) => payload?.[0]?.payload?.opp ?? ''}
            formatter={(v, name) => name === '_trend'
              ? [sel.fmt ? sel.fmt(v) : Number(v).toFixed(2), 'Trend']
              : [sel.fmt ? sel.fmt(v) : v, sel.label]
            }
          />
          <Line
            type="monotone"
            dataKey={sel.key}
            name={sel.label}
            stroke={sel.color}
            strokeWidth={2}
            dot={{ r: 3, fill: sel.color, strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            connectNulls={false}
          />
          {trendFn && (
            <Line
              type="linear"
              dataKey="_trend"
              name="_trend"
              stroke={sel.color}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              strokeOpacity={0.45}
              dot={false}
              activeDot={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Report Card ──────────────────────────────────────────────────────────────

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function gradeScore(score) {
  if (score >= 85) return { letter: 'A', color: 'text-emerald-400' };
  if (score >= 70) return { letter: 'B', color: 'text-blue-400'    };
  if (score >= 50) return { letter: 'C', color: 'text-yellow-400'  };
  if (score >= 30) return { letter: 'D', color: 'text-orange-400'  };
  return                  { letter: 'F', color: 'text-red-400'     };
}

// rank: 1 = best. higher value = better rank (used for VER and ptShare).
// lower value = better rank (used for faultShare — fewer faults is better).
function rankAmong(value, allValues, higherIsBetter = true) {
  if (value == null) return null;
  const valid = allValues.filter(v => v != null);
  if (!valid.length) return null;
  const rank = valid.filter(v => higherIsBetter ? v > value : v < value).length + 1;
  return { rank, total: valid.length };
}

function PlayerReportCard({ row, allRows = [], teamPoints = 0, oppPoints = 0 }) {
  // Offensive production share
  const playerPts   = (row.k ?? 0) + (row.ace ?? 0) + (row.bs ?? 0) + (row.ba ?? 0);
  const playerFault = (row.se ?? 0) + (row.ae ?? 0) + (row.net ?? 0) + (row.lift ?? 0)
                    + (row.bhe ?? 0) + (row.fbe ?? 0) + (row.p0 ?? 0);
  const ptSharePct    = teamPoints > 0 ? (playerPts / teamPoints) * 100 : null;
  const faultSharePct = oppPoints  > 0 ? (playerFault / oppPoints) * 100 : null;

  // Rankings among teammates (players with sp > 0)
  const verRank      = rankAmong(row.ver, allRows.map(r => r.ver), true);
  const ptRank       = rankAmong(playerPts, allRows.map(r =>
    (r.k ?? 0) + (r.ace ?? 0) + (r.bs ?? 0) + (r.ba ?? 0)), true);
  const faultRank    = rankAmong(playerFault, allRows.map(r =>
    (r.se ?? 0) + (r.ae ?? 0) + (r.net ?? 0) + (r.lift ?? 0) +
    (r.bhe ?? 0) + (r.fbe ?? 0) + (r.p0 ?? 0)), false);
  const tiles = [
    row.sa > 0 && {
      label: 'Serving',
      display: fmtPct(row.ace_pct),
      sub: 'ACE%',
      score: clamp(((row.ace_pct ?? 0) / 0.12) * 100, 0, 100),
      radar: clamp(((row.ace_pct ?? 0) / 0.12) * 100, 0, 100),
    },
    row.pa > 0 && {
      label: 'Passing',
      display: fmtPassRating(row.apr),
      sub: 'APR',
      score: clamp(((row.apr ?? 0) / 2.5) * 100, 0, 100),
      radar: clamp(((row.apr ?? 0) / 2.5) * 100, 0, 100),
    },
    row.ta > 0 && {
      label: 'Attacking',
      display: fmtHitting(row.hit_pct),
      sub: 'HIT%',
      score: clamp((((row.hit_pct ?? -0.1) + 0.1) / 0.45) * 100, 0, 100),
      radar: clamp((((row.hit_pct ?? -0.1) + 0.1) / 0.45) * 100, 0, 100),
    },
    row.dig > 0 && {
      label: 'Defense',
      display: fmtCount(row.dips != null ? +row.dips.toFixed(1) : null),
      sub: 'DIG/Set',
      score: clamp(((row.dips ?? 0) / 4) * 100, 0, 100),
      radar: clamp(((row.dips ?? 0) / 4) * 100, 0, 100),
    },
    (row.bs > 0 || row.ba > 0) && {
      label: 'Blocking',
      display: fmtCount(row.bps != null ? +row.bps.toFixed(2) : null),
      sub: 'BLK/Set',
      score: clamp(((row.bps ?? 0) / 1.5) * 100, 0, 100),
      radar: clamp(((row.bps ?? 0) / 1.5) * 100, 0, 100),
    },
    row.ast > 0 && {
      label: 'Setting',
      display: fmtCount(row.aps != null ? +row.aps.toFixed(1) : null),
      sub: 'AST/Set',
      score: clamp(((row.aps ?? 0) / 10) * 100, 0, 100),
      radar: clamp(((row.aps ?? 0) / 10) * 100, 0, 100),
    },
  ].filter(Boolean);

  const verColor = row.ver == null ? 'text-slate-400'
    : row.ver >= 6   ? 'text-emerald-400'
    : row.ver >= 2   ? 'text-blue-400'
    : row.ver >= -1  ? 'text-yellow-400'
    : 'text-red-400';

  const verTier = row.ver != null ? VER_TIERS.find(t => row.ver >= t.min) : null;

  const radarData = tiles.map(t => ({ dim: t.label, score: Math.round(t.radar) }));

  return (
    <div className="p-4 space-y-4">
      {/* VER hero */}
      <div className="bg-surface rounded-xl p-4 text-center">
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Volleyball Efficiency Rating</div>
        <div className={`text-5xl font-black ${verColor}`}>
          {row.ver != null ? fmtVER(row.ver) : '—'}
        </div>
        {verTier && (
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded border text-xs font-bold mt-2 ${verTier.cls}`}>
            {verTier.label}
          </div>
        )}
        <div className="text-xs text-slate-500 mt-1">{row.sp ?? 0} sets played · {row.mp ?? 0} matches</div>
        {verRank && (
          <div className="text-xs text-slate-500 mt-0.5">
            Ranked <span className="text-white font-semibold">{verRank.rank}</span> of {verRank.total} on team
          </div>
        )}
      </div>

      {/* Stat tiles */}
      {tiles.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {tiles.map((t) => {
            const { letter, color } = gradeScore(t.score);
            return (
              <div key={t.label} className="bg-surface rounded-xl p-3 flex items-center gap-3">
                <div className={`text-3xl font-black w-10 text-center shrink-0 ${color}`}>{letter}</div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-white truncate">{t.label}</div>
                  <div className="text-xs text-slate-400">{t.display} <span className="text-slate-500">{t.sub}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Offensive Production */}
      {(ptSharePct !== null || faultSharePct !== null) && (
        <div className="bg-surface rounded-xl p-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Offensive Production</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-3xl font-black text-emerald-400">
                {ptSharePct !== null ? ptSharePct.toFixed(1) + '%' : '—'}
              </div>
              <div className="text-xs text-slate-400 mt-1">of Team Points</div>
              <div className="text-[10px] text-slate-500 mt-0.5 tabular-nums">{playerPts} / {teamPoints} pts</div>
              <div className="text-[10px] text-slate-600 mt-0.5">K + ACE + BLK</div>
              {ptRank && (
                <div className="text-[10px] text-slate-500 mt-1">
                  <span className="text-slate-300 font-semibold">{ptRank.rank}</span> of {ptRank.total} on team
                </div>
              )}
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-red-400">
                {faultSharePct !== null ? faultSharePct.toFixed(1) + '%' : '—'}
              </div>
              <div className="text-xs text-slate-400 mt-1">of Opp Points</div>
              <div className="text-[10px] text-slate-500 mt-0.5 tabular-nums">{playerFault} / {oppPoints} pts</div>
              <div className="text-[10px] text-slate-600 mt-0.5">SE + AE + NET + L + BHE + FBE + P0</div>
              {faultRank && (
                <div className="text-[10px] text-slate-500 mt-1">
                  <span className="text-slate-300 font-semibold">{faultRank.rank}</span> of {faultRank.total} on team
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Radar chart */}
      {radarData.length >= 3 && (
        <div className="bg-surface rounded-xl p-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Skill Profile</p>
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData} margin={{ top: 8, right: 28, left: 28, bottom: 8 }}>
              <PolarGrid stroke="#334155" />
              <PolarAngleAxis dataKey="dim" tick={{ fill: '#94a3b8', fontSize: 11 }} />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Radar dataKey="score" stroke="#f97316" fill="#f97316" fillOpacity={0.25} dot={{ r: 3, fill: '#f97316' }} />
              <Tooltip
                contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8, fontSize: 12 }}
                formatter={(v) => [`${v}/100`]}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

const CHIP = 'px-3 py-1 rounded-full text-xs font-semibold transition-colors';
const chipClass = (active) =>
  active
    ? `${CHIP} bg-primary text-white`
    : `${CHIP} bg-surface text-slate-400 hover:text-white`;

const STAT_TABS = [
  { value: 'serving',   label: 'Serving'   },
  { value: 'passing',   label: 'Passing'   },
  { value: 'attacking', label: 'Attacking' },
  { value: 'blocking',  label: 'Blocking'  },
  { value: 'setting',   label: 'Setting'   },
  { value: 'defense',   label: 'Defense'   },
  { value: 'ver',       label: 'VER'       },
];

const BY_GAME_COLS = [
  { key: 'date',    label: 'Date'  },
  { key: 'opp',    label: 'Opp'   },
  { key: 'si_pct', label: 'S%',   fmt: fmtPct      },
  { key: 'ace',    label: 'ACE',  fmt: fmtCount     },
  { key: 'se',     label: 'SE',   fmt: fmtCount     },
  { key: 'k',      label: 'K',    fmt: fmtCount     },
  { key: 'ae',     label: 'AE',   fmt: fmtCount     },
  { key: 'hit_pct',label: 'HIT%', fmt: fmtHitting   },
  { key: 'blks',   label: 'BLKS', fmt: fmtCount     },
  { key: 'dig',    label: 'DIG',  fmt: fmtCount     },
  { key: 'ast',    label: 'AST',  fmt: fmtCount     },
  { key: 'ver',    label: 'VER',  fmt: fmtVER       },
];

// Strip the 'name' column — player identity is already in the page header
function withoutNameCol(cols) {
  return cols.filter((c) => c.key !== 'name');
}

export function PlayerStatsPage() {
  const { teamId, playerId } = useParams();
  const [searchParams] = useSearchParams();
  const pid = Number(playerId);
  const tid = Number(teamId);
  const seasonParam = searchParams.get('season');

  const [mainTab,   setMainTab]   = useState('season');
  const [statTab,   setStatTab]   = useState('serving');
  const [serveView, setServeView] = useState('all');
  const [loading,   setLoading]   = useState(false);
  const [stats,     setStats]     = useState(null); // { playerRow, trends, matches }

  const player = useLiveQuery(() => db.players.get(pid), [pid]);

  const seasons = useLiveQuery(
    () => db.seasons.where('team_id').equals(tid).toArray(),
    [tid]
  );

  const season = useMemo(() => {
    if (!seasons?.length) return null;
    if (seasonParam) {
      const found = seasons.find(s => String(s.id) === seasonParam);
      if (found) return found;
    }
    return [...seasons].sort((a, b) => b.id - a.id)[0];
  }, [seasons, seasonParam]);

  // Exclude exhibition and scheduled (future) matches — they don't count toward season stats
  const matches = useLiveQuery(
    () =>
      season
        ? db.matches.where('season_id').equals(season.id)
            .filter(m => m.match_type !== 'exhibition' && m.status !== 'scheduled')
            .sortBy('date')
        : Promise.resolve([]),
    [season?.id]
  );

  useEffect(() => {
    if (!matches?.length) {
      setStats(null);
      return;
    }
    setLoading(true);
    const matchIds = matches.map((m) => m.id);
    Promise.all([
      getContactsForMatches(matchIds),
      getBatchSetsPlayedCount(matchIds),
      getPlayerPositionsForMatches(matchIds),
      getOurScoredForMatches(matchIds),
      getOppScoredForMatches(matchIds),
    ])
      .then(([contacts, setsPerMatch, playerPositions, teamPoints, oppPoints]) => {
        const allStats  = computePlayerStats(contacts, 1, playerPositions);
        const playerRow = allStats[pid] ?? null;
        const allRows   = Object.values(allStats).filter(r => (r.sp ?? 0) > 0);
        const trends    = computePlayerTrends(matches, contacts, setsPerMatch, playerPositions);
        const teamRow   = computeTeamStats(contacts, 1);
        setStats({ playerRow, allRows, trends, teamPoints, oppPoints, teamRow });
      })
      .finally(() => setLoading(false));
  }, [matches, pid]); // eslint-disable-line react-hooks/exhaustive-deps -- intentional: recompute only when source data or player changes, not on internal setter references

  // Single-row array for StatTable
  const statRow = useMemo(() => {
    if (!stats?.playerRow || !player) return [];
    return [{ id: String(pid), name: player.name, ...stats.playerRow }];
  }, [stats, player, pid]);

  // Per-match rows for By Game tab
  const byGameRows = useMemo(() => {
    if (!stats?.trends) return [];
    const trendRows = stats.trends.byPlayer[pid];
    if (!trendRows) return [];
    return stats.trends.matches.map((m, i) => {
      const row = trendRows[i];
      const d   = m.date ? new Date(m.date) : null;
      const dateStr = d ? `${d.getMonth() + 1}/${d.getDate()}` : '—';
      const opp     = m.opponentName || '—';
      const oppAbbr = m.opponentAbbr || m.opponentName?.slice(0, 4).toUpperCase() || dateStr;
      if (!row) return { _key: m.id, date: dateStr, opp, oppAbbr, si_pct: null, ace: null, se: null, k: null, ae: null, hit_pct: null, blks: null, dig: null, ast: null, ver: null };
      return { _key: m.id, date: dateStr, opp, oppAbbr, ...row, blks: (row.bs ?? 0) + (row.ba ?? 0) };
    });
  }, [stats, pid]);

  const servingCols = useMemo(
    () => withoutNameCol(SERVING_COLS[serveView] ?? SERVING_COLS.all),
    [serveView]
  );

  const currentCols = useMemo(
    () => (statTab === 'serving' ? servingCols : withoutNameCol(TAB_COLUMNS[statTab] ?? [])),
    [statTab, servingCols]
  );

  if (!player) {
    return (
      <div className="flex items-center justify-center h-48">
        <Spinner />
      </div>
    );
  }

  const headerTitle = (
    <span className="flex items-baseline gap-2">
      <span className="font-mono text-primary mr-1">#{player.jersey_number}</span>
      {player.name}
      {player.year && (
        <span className="text-sm font-normal text-slate-400">{player.year}</span>
      )}
    </span>
  );

  return (
    <div>
      <PageHeader
        title={headerTitle}
        backTo={`/teams/${teamId}`}
        action={<Badge color={POS_COLOR[player.position] ?? 'gray'}>{player.position}</Badge>}
      />

      <TabBar
        tabs={[
          { value: 'season',      label: 'Season Stats' },
          { value: 'bygame',      label: 'By Game'       },
          { value: 'report_card', label: 'Report Card'   },
        ]}
        active={mainTab}
        onChange={setMainTab}
      />

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Spinner />
        </div>
      ) : mainTab === 'season' ? (
        !stats?.playerRow ? (
          <EmptyState title="No stats yet" description="Record a match to see stats here." />
        ) : (
          <div>
            <TabBar tabs={STAT_TABS} active={statTab} onChange={setStatTab} />

            {statTab === 'serving' && (
              <div className="flex gap-2 px-4 py-2 border-b border-slate-800">
                {[['all', 'All'], ['float', 'Float'], ['top', 'Topspin']].map(([v, label]) => (
                  <button key={v} onClick={() => setServeView(v)} className={chipClass(serveView === v)}>
                    {label}
                  </button>
                ))}
              </div>
            )}

            <div className="px-2 py-3">
              <StatTable columns={currentCols} rows={statRow} />
            </div>
            <PerGameTrendGraph key={`${statTab}-${serveView}`} rows={byGameRows} statTab={statTab} serveView={serveView} />
          </div>
        )
      ) : mainTab === 'report_card' ? (
        !stats?.playerRow ? (
          <EmptyState title="No stats yet" description="Record a match to see the report card." />
        ) : (
          <PlayerReportCard
            row={stats.playerRow}
            allRows={stats.allRows ?? []}
            teamPoints={stats.teamPoints ?? 0}
            oppPoints={stats.oppPoints ?? 0}
          />
        )
      ) : (
        // By Game tab
        byGameRows.length === 0 ? (
          <EmptyState title="No matches" description="No matches recorded this season." />
        ) : (
          <div className="overflow-x-auto py-3">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700">
                  {BY_GAME_COLS.map((c) => (
                    <th
                      key={c.key}
                      className={`px-2 py-2 font-semibold text-slate-400 whitespace-nowrap ${
                        c.key === 'date' || c.key === 'opp' ? 'text-left' : 'text-right'
                      }`}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {byGameRows.map((row, i) => (
                  <tr
                    key={row._key}
                    className={`border-b border-slate-800 ${i % 2 === 0 ? '' : 'bg-slate-900/40'}`}
                  >
                    {BY_GAME_COLS.map((c) => {
                      const v     = row[c.key];
                      const isLeft = c.key === 'date' || c.key === 'opp';
                      return (
                        <td
                          key={c.key}
                          className={`px-2 py-2 tabular-nums text-slate-300 ${isLeft ? 'text-left' : 'text-right'}`}
                        >
                          {v == null ? '—' : c.fmt ? c.fmt(v) : v}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}
