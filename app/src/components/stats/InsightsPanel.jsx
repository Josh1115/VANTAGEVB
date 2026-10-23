import { useState, useEffect } from 'react';
import { computeWinCorrelation, computeSeasonStats, pickMetricVal, pickMetricVar } from '../../stats/engine';
import { Drawer } from '../ui/Drawer';

const INSIGHTS_GLOSSARY = [
  { abbr: 'Win Factors',  full: 'Ranked by impact',         def: 'Metrics are sorted by how strongly they separate your wins from losses, relative to how much that stat normally bounces around match-to-match. A big gap on a stat that\'s usually steady ranks higher than the same-size gap on a stat that swings wildly anyway — a jumpy stat isn\'t a real pattern just because it looks big. Close matches (decided by one set) count more toward these averages than lopsided sweeps, since close matches show what winning actually takes.' },
  { abbr: 'Confidence',   full: 'How much to trust this',   def: 'Based on how many matches this is built from. Fewer than 5 total matches = Low confidence. Otherwise it\'s Medium, or High once both your wins and your losses have 10+ matches. Insights still calculate normally at Low confidence (once you have at least 2 wins and 2 losses) — the badge is just a heads-up that a small sample can be luck.' },
  { abbr: 'Win Factor %', full: 'Share of win/loss gap',    def: 'What percentage of total win/loss separation this metric accounts for across all tracked stats. A 28% win factor means this stat explains more of your outcomes than most others.' },
  { abbr: 'Colors',       full: 'Green / Amber / Red',      def: 'Green = currently at or near win-level performance. Amber = close, worth monitoring. Red = currently tracking closer to your loss average — prioritize improvement here.' },
  { abbr: 'APR',          full: 'Pass Rating',               def: 'Average pass quality on a 0–3 scale (0 = no attack opportunity, 3 = perfect). Higher APR gives your setter more options and leads to better offensive efficiency.' },
  { abbr: 'SO%',          full: 'Sideout %',                 def: 'How often you score a point when receiving serve. Elite teams sideout 65%+. This is one of the most predictive stats for set and match outcomes.' },
  { abbr: 'SP%',          full: 'Serving Point %',           def: 'How often you score a point when serving. Serving points are harder to earn than sideouts — 45%+ is strong. High SP% means your serve/defense creates extra points.' },
  { abbr: '3OPT%',        full: 'In-System Win %',           def: 'Win rate on attacks following a perfect pass (rated 3). Measures how well you convert your best offensive opportunities into points.' },
  { abbr: 'K%',           full: 'Kill %',                    def: 'Kills divided by total attack attempts. League average is roughly 35–40%. Reflects raw finishing rate independent of errors.' },
  { abbr: 'K/Set',        full: 'Kills per Set',             def: 'Total kills divided by sets played. Volume metric — high K/Set means your offense is producing consistently across the match.' },
  { abbr: 'AE/Set',       full: 'Attack Errors per Set',     def: 'Unforced attack errors per set. Lower is better — each error is a free point for the opponent and disrupts momentum.' },
  { abbr: 'HIT%',         full: 'Hitting Efficiency',        def: '(Kills − Errors) / Attempts. The gold standard offensive metric. .200+ is good, .300+ is excellent, negative means errors outnumber kills.' },
  { abbr: 'EarnPts%',     full: 'Earned Points %',           def: 'Percentage of your points earned through positive plays (kills, aces, blocks) vs. opponent errors. Higher = more self-sufficient offense.' },
  { abbr: 'ACE%',         full: 'Ace %',                     def: 'Percentage of serves resulting in an ace. Aces score directly and disrupt the opponent\'s serve receive system, compounding into more favorable attack opportunities.' },
  { abbr: 'SE%',          full: 'Serve Error %',             def: 'Percentage of serves that result in an error. Lower is better — serve errors are free points for the opponent with no defensive effort required.' },
  { abbr: 'BLK/Set',      full: 'Blocks per Set',            def: 'Blocks (solo + 0.5 × block assist) per set. Strong blocking directly scores points and suppresses opponent hitting efficiency over time.' },
  { abbr: 'Player Win Factors', full: 'Players who swing outcomes', def: 'Ranks players by how much their overall rating (VER) differs between matches you won and matches you lost. VER already adjusts for position, so a libero and an outside hitter can be compared on the same scale. Only players with at least 2 matches in both your wins and your losses are shown, to avoid one big game looking like a pattern.' },
];

const pctFmt = (v) => v != null ? `${Math.round(v * 100)}%` : '—';

const INSIGHT_METRICS = [
  { label: 'Pass Rating',          key: 'apr',         src: 'team',         fmt: (v) => v?.toFixed(2) ?? '—', higherBetter: true  },
  { label: 'Sideout %',            key: 'so_pct',      src: 'rotation',     fmt: pctFmt,                      higherBetter: true  },
  { label: 'Serving Point %',       key: 'bp_pct',      src: 'rotation',     fmt: pctFmt,                      higherBetter: true  },
  { label: '3OPT %',               key: 'win_pct',     src: 'isOos_is',     fmt: pctFmt,                      higherBetter: true  },
  { label: 'Kill %',               key: 'k_pct',       src: 'team',         fmt: pctFmt,                      higherBetter: true  },
  { label: 'Kills / Set',          key: 'kps',         src: 'team',         fmt: (v) => v?.toFixed(1) ?? '—', higherBetter: true  },
  { label: 'Attack Errors / Set',  key: 'aeps',        src: 'team',         fmt: (v) => v?.toFixed(1) ?? '—', higherBetter: false },
  { label: 'Hitting Eff.',         key: 'hit_pct',     src: 'team',         fmt: (v) => v?.toFixed(3) ?? '—', higherBetter: true  },
  { label: 'Earned Pts %',         key: 'earned_pct',  src: 'pointQuality', fmt: pctFmt,                      higherBetter: true  },
  { label: 'Ace %',                key: 'ace_pct',     src: 'team',         fmt: pctFmt,                      higherBetter: true  },
  { label: 'Serve Error %',        key: 'se_pct',      src: 'team',         fmt: pctFmt,                      higherBetter: false },
  { label: 'Blocks / Set',         key: 'bps',         src: 'team',         fmt: (v) => v?.toFixed(2) ?? '—', higherBetter: true  },
];

// Per-player skills tested against wins/losses. vol/min = the player must average at least
// `min` of that volume stat per match in both wins and losses, so a libero's 3 swings
// all season can't surface as a "hitting" factor.
const PLAYER_SKILLS = [
  { label: 'Kills / Set',         key: 'kps',     vol: 'ta',      min: 5,   fmt: (v) => v.toFixed(1), higherBetter: true  },
  { label: 'Hitting Eff.',        key: 'hit_pct', vol: 'ta',      min: 8,   fmt: (v) => v.toFixed(3), higherBetter: true  },
  { label: 'Attack Errors / Set', key: 'aeps',    vol: 'ta',      min: 5,   fmt: (v) => v.toFixed(1), higherBetter: false },
  { label: 'Ace %',               key: 'ace_pct', vol: 'sa',      min: 5,   fmt: pctFmt,              higherBetter: true  },
  { label: 'Serve Error %',       key: 'se_pct',  vol: 'sa',      min: 5,   fmt: pctFmt,              higherBetter: false },
  { label: 'Pass Rating',         key: 'apr',     vol: 'pa',      min: 5,   fmt: (v) => v.toFixed(2), higherBetter: true  },
  { label: 'Digs / Set',          key: 'dips',    vol: 'dig',     min: 1,   fmt: (v) => v.toFixed(1), higherBetter: true  },
  { label: 'Blocks / Set',        key: 'bps',     vol: 'blk',     min: 0.5, fmt: (v) => v.toFixed(2), higherBetter: true  },
  { label: 'Assists / Set',       key: 'aps',     vol: 'set_att', min: 10,  fmt: (v) => v.toFixed(1), higherBetter: true  },
];

// How much a stat separates wins from losses, relative to how much it normally moves
// around from match to match (Cohen's-d-style effect size). The denominator is floored
// relative to the metric's own scale — with only a couple of matches per side, a
// variance of exactly 0 is a sample-size artifact, not proof the stat is perfectly
// consistent, so don't let it blow the score up to infinity.
function effectSize(winVal, lossVal, winVar, lossVar) {
  const gap = Math.abs(winVal - lossVal);
  const pooledSd = Math.sqrt(((winVar ?? 0) + (lossVar ?? 0)) / 2);
  const scale = (Math.abs(winVal) + Math.abs(lossVal)) / 2 || 1;
  return gap / Math.max(pooledSd, scale * 0.05);
}

// "How?" breakdown for the two rally-outcome metrics — maps an INSIGHT_METRICS key to
// its computePointPaths bucket. good: true = more of this helps you win.
const POINT_PATHS = {
  bp_pct: {
    bucket: 'sp', unit: 'of every 100 of your serves',
    rows: [
      { k: 'ace',        label: 'Aces',                           good: true  },
      { k: 'kill',       label: 'Our kills & blocks in the rally', good: true  },
      { k: 'opp_err',    label: 'Opponent errors',                good: true  },
      { k: 'won_other',  label: 'Won (not tagged)',               good: true,  untagged: true },
      { k: 'se',         label: 'Our serve errors',               good: false },
      { k: 'our_err',    label: 'Our other errors',               good: false },
      { k: 'opp_kill',   label: 'Opponent kills & blocks',        good: false },
      { k: 'lost_other', label: 'Lost (not tagged)',              good: false, untagged: true },
    ],
  },
  so_pct: {
    bucket: 'so', unit: 'of every 100 opponent serves',
    rows: [
      { k: 'fbso',       label: 'First-ball kills (right off the pass)', good: true  },
      { k: 'kill',       label: 'Kills & blocks later in the rally',     good: true  },
      { k: 'opp_se',     label: 'Opponent missed serves',                good: true  },
      { k: 'opp_err',    label: 'Opponent other errors',                 good: true  },
      { k: 'won_other',  label: 'Won (not tagged)',                      good: true,  untagged: true },
      { k: 'aced',       label: 'Aced / zero passes',                    good: false },
      { k: 'our_err',    label: 'Our hitting & other errors',            good: false },
      { k: 'opp_kill',   label: 'Opponent kills & blocks',               good: false },
      { k: 'lost_other', label: 'Lost (not tagged)',                     good: false, untagged: true },
    ],
  },
};

function PointPathsBreakdown({ config, win, loss }) {
  const per100 = (v) => (v == null ? null : Math.round(v * 100));
  const rows = config.rows
    .map((r) => ({ ...r, w: per100(win?.pointPaths?.[config.bucket]?.[r.k]), l: per100(loss?.pointPaths?.[config.bucket]?.[r.k]) }))
    .filter((r) => r.w != null && r.l != null && (r.w > 0 || r.l > 0));
  if (!rows.length) return <p className="text-xs text-slate-500 mt-2">Not enough tagged rallies yet.</p>;

  // Headline = the tagged reason whose rate changed most between wins and losses
  const top = rows.filter((r) => !r.untagged).sort((a, b) => Math.abs(b.w - b.l) - Math.abs(a.w - a.l))[0];
  const diff = top ? top.w - top.l : 0;
  const headline = !top || diff === 0
    ? 'No single reason stands out — wins and losses ended points about the same way.'
    : top.good
      ? `Biggest difference: ${top.label.toLowerCase()} — ${top.w} in wins vs ${top.l} in losses (${config.unit}).`
      : `Biggest difference: ${top.label.toLowerCase()} — ${top.l} in losses vs ${top.w} in wins (${config.unit}).`;

  return (
    <div className="mt-2.5 rounded-lg bg-slate-800/60 p-2.5">
      <p className="text-xs text-white font-semibold leading-relaxed mb-2">{headline}</p>
      <div className="flex text-[10px] font-bold tracking-wide text-slate-500 mb-1">
        <span className="flex-1">HOW POINTS ENDED ({config.unit.toUpperCase()})</span>
        <span className="w-10 text-right text-red-400">LOSS</span>
        <span className="w-10 text-right text-emerald-400">WIN</span>
      </div>
      {rows.map((r) => (
        <div key={r.k} className={`flex items-center text-xs py-0.5 ${r === top ? 'text-white font-bold' : 'text-slate-400'}`}>
          <span className="flex-1">{r.good ? '＋' : '－'} {r.label}</span>
          <span className="w-10 text-right tabular-nums">{r.l}</span>
          <span className="w-10 text-right tabular-nums">{r.w}</span>
        </div>
      ))}
    </div>
  );
}

// currentStats: optional pre-computed stats object shaped like computeSeasonStats output.
//   When provided, the season-level fetch is skipped and currentLabel is used for the middle column.
// filters: optional, same shape as computeSeasonStats' filters (conference, location, matchType,
//   result, matchIds, dateFrom/dateTo) — narrows which matches the win/loss comparison is built
//   from, e.g. so a "Last 5" or "Conference only" filter on the page also reshapes Insights.
export function InsightsPanel({ seasonId, currentStats = null, currentLabel = 'THIS SEASON', filters = null, playerNames = null }) {
  const [data,         setData]         = useState(null);
  const [allStats,     setAllStats]     = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [barsReady,    setBarsReady]    = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);
  const [openHintKey,  setOpenHintKey]  = useState(null);
  const [openHowKey,   setOpenHowKey]   = useState(null);

  const filterKey = JSON.stringify(filters ?? {});

  useEffect(() => {
    if (!seasonId) return;
    setData(null);
    setAllStats(null);
    setLoading(true);
    setBarsReady(false);
    const activeFilters = filterKey ? JSON.parse(filterKey) : {};
    const tasks = currentStats
      ? [computeWinCorrelation(Number(seasonId), activeFilters)]
      : [computeWinCorrelation(Number(seasonId), activeFilters), computeSeasonStats(Number(seasonId), activeFilters)];
    Promise.all(tasks)
      .then(([corr, season]) => { setData(corr); setAllStats(season ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [seasonId, filterKey]);

  useEffect(() => {
    if (!data) return;
    const id = requestAnimationFrame(() => setBarsReady(true));
    return () => cancelAnimationFrame(id);
  }, [data]);

  if (!seasonId) return (
    <div className="text-center py-12 px-4">
      <p className="text-slate-500 text-sm">No season linked to this match.</p>
    </div>
  );

  if (loading) return (
    <div className="flex justify-center py-12">
      <span className="text-slate-500 text-sm">Computing insights…</span>
    </div>
  );

  if (!data) return (
    <div className="text-center py-12 px-4">
      <div className="text-3xl mb-3">📊</div>
      <p className="text-slate-400 font-semibold">Not enough data yet</p>
      <p className="text-slate-600 text-sm mt-1">Need at least 2 wins and 2 losses to show win correlations.</p>
    </div>
  );

  const { win, loss } = data;
  const displayStats = currentStats ?? allStats;

  const minMatches = Math.min(win.matches, loss.matches);
  const totalMatches = win.matches + loss.matches;
  const confidence = totalMatches < 5
    ? { label: 'Low confidence',    cls: 'bg-red-400/10 text-red-400 border-red-400/30' }
    : minMatches >= 10
    ? { label: 'High confidence',   cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' }
    : { label: 'Medium confidence', cls: 'bg-amber-400/10 text-amber-400 border-amber-400/30' };

  // Compute impact score for each metric: how much does this stat separate wins from
  // losses, relative to how much it normally moves around from match to match? A stat
  // that's naturally noisy (high variance) needs a bigger gap to count as a real signal
  // than a stat that's normally rock-steady.
  const scoredMetrics = INSIGHT_METRICS.map((metric) => {
    const { key, src } = metric;
    const winVal  = pickMetricVal(src, key, win);
    const lossVal = pickMetricVal(src, key, loss);
    if (winVal == null || lossVal == null) return { ...metric, winVal, lossVal, impactScore: -1 };
    const impactScore = effectSize(winVal, lossVal, pickMetricVar(src, key, win), pickMetricVar(src, key, loss));
    return { ...metric, winVal, lossVal, impactScore };
  }).sort((a, b) => b.impactScore - a.impactScore);

  const totalImpact = scoredMetrics.reduce((sum, m) => sum + Math.max(0, m.impactScore), 0);

  const RANK_STYLES = [
    { badge: '#1', cls: 'bg-amber-400/20 text-amber-300 border border-amber-400/40' },
    { badge: '#2', cls: 'bg-slate-400/20 text-slate-300 border border-slate-400/40' },
    { badge: '#3', cls: 'bg-orange-900/40 text-orange-400 border border-orange-700/40' },
  ];

  return (
    <div className="space-y-4">
      <div className="px-1 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-black tracking-widest text-slate-500 uppercase">Win Factors</p>
          <p className="text-xs text-slate-600 mt-0.5">
            Ranked by impact — stats that most separate your {win.matches}W from your {loss.matches}L.
          </p>
          <span className={`inline-block mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md border tracking-wide ${confidence.cls}`}>
            {confidence.label} · {win.matches}W / {loss.matches}L
          </span>
        </div>
        <button
          onClick={() => setGlossaryOpen(true)}
          className="shrink-0 w-8 h-8 rounded-full border border-slate-600 text-slate-400 hover:text-white hover:border-slate-400 text-sm font-black flex items-center justify-center transition-colors"
          aria-label="Glossary"
        >
          ?
        </button>
      </div>

      {glossaryOpen && (
        <Drawer centered title="Insights Glossary" onClose={() => setGlossaryOpen(false)}>
          <ul className="space-y-4">
            {INSIGHTS_GLOSSARY.map((e) => (
              <li key={e.abbr} className="flex gap-3 items-start">
                <span className="w-20 shrink-0 font-mono text-sm font-bold text-primary pt-px">{e.abbr}</span>
                <div>
                  <div className="text-sm font-semibold text-white leading-snug">{e.full}</div>
                  <div className="text-xs text-slate-400 mt-0.5 leading-relaxed">{e.def}</div>
                </div>
              </li>
            ))}
          </ul>
        </Drawer>
      )}

      <div className="grid grid-cols-1 gap-2.5">
        {scoredMetrics.map(({ label, key, src, fmt, higherBetter, winVal, lossVal, impactScore }, idx) => {
          const nowVal = pickMetricVal(src, key, displayStats);

          if (winVal == null || lossVal == null) return null;

          const wv = higherBetter ? winVal  : -winVal;
          const lv = higherBetter ? lossVal : -lossVal;
          const nv = nowVal != null ? (higherBetter ? nowVal : -nowVal) : null;

          const range = wv - lv;
          const pos = nv != null && range !== 0 ? (nv - lv) / range : null;

          const statusColor = pos == null ? 'text-slate-500'
            : pos >= 0.65 ? 'text-emerald-400'
            : pos >= 0.35 ? 'text-amber-400'
            : 'text-red-400';
          const statusLabel = pos == null ? '—'
            : pos >= 0.65 ? '✓ On track'
            : pos >= 0.35 ? 'Watch this'
            : '✗ Focus here';

          const barPct = pos != null ? Math.max(0, Math.min(100, Math.round(pos * 100))) : null;
          const rank   = RANK_STYLES[idx];

          return (
            <div key={key} className="bg-surface rounded-xl p-3.5 border border-slate-700/40">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {rank && (
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md tracking-wide ${rank.cls}`}>
                      {rank.badge}
                    </span>
                  )}
                  <span className="text-xs font-black uppercase tracking-wide text-slate-300">{label}</span>
                </div>
                <span className={`text-xs font-bold ${statusColor}`}>{statusLabel}</span>
              </div>

              <div className="flex items-end gap-4 mb-2.5">
                <div className="flex-1 text-center">
                  <div className="text-lg font-black text-red-400 tabular-nums leading-none">{fmt(lossVal)}</div>
                  <div className="text-[10px] text-red-900 font-bold mt-0.5 tracking-wide">LOSS AVG</div>
                </div>
                <div className="flex-1 text-center">
                  <div className={`text-lg font-black tabular-nums leading-none ${statusColor}`}>
                    {nowVal != null ? fmt(nowVal) : '—'}
                  </div>
                  <div className="text-[10px] text-slate-500 font-bold mt-0.5 tracking-wide">{currentLabel}</div>
                </div>
                <div className="flex-1 text-center">
                  <div className="text-lg font-black text-emerald-400 tabular-nums leading-none">{fmt(winVal)}</div>
                  <div className="text-[10px] text-emerald-700 font-bold mt-0.5 tracking-wide">WIN AVG</div>
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

              {POINT_PATHS[key] && (
                <div className="mt-2.5">
                  <button
                    type="button"
                    onClick={() => setOpenHowKey(openHowKey === key ? null : key)}
                    className="text-[11px] font-black uppercase tracking-wide text-blue-400 hover:text-blue-300"
                    aria-expanded={openHowKey === key}
                  >
                    {openHowKey === key ? '▾' : '▸'} How did we win / lose these points?
                  </button>
                  {openHowKey === key && <PointPathsBreakdown config={POINT_PATHS[key]} win={win} loss={loss} />}
                </div>
              )}

              {/* Value of hitting the goal */}
              <div className="mt-3 pt-3 border-t border-slate-700/50">
                {(() => {
                  const share = totalImpact > 0 ? Math.round((impactScore / totalImpact) * 100) : 0;
                  const hintOpen = openHintKey === key;
                  return (
                    <>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13.8px] font-bold text-white uppercase tracking-wide">Win Factor: </span>
                        <span className="text-[13.8px] font-black text-blue-400">{share}%</span>
                        <button
                          type="button"
                          onClick={() => setOpenHintKey(hintOpen ? null : key)}
                          className="w-4 h-4 rounded-full border border-slate-600 text-slate-500 hover:text-white hover:border-slate-400 text-[9px] font-black flex items-center justify-center transition-colors shrink-0"
                          aria-label="What does Win Factor mean?"
                          aria-expanded={hintOpen}
                        >
                          i
                        </button>
                      </div>
                      {hintOpen && (
                        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                          Of every stat tracked, this one explains {share}% of the gap between your wins and losses — the higher the number, the more this stat matters to winning.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          );
        })}
      </div>

      {playerNames && Object.keys(playerNames).length > 0 && (() => {
        const allPlayerIds = new Set([
          ...Object.keys(win.players ?? {}),
          ...Object.keys(loss.players ?? {}),
        ]);
        // One candidate per player × skill; the 5 strongest across the team are shown,
        // so a player can appear twice if two of their skills both matter.
        const scoredPlayers = Array.from(allPlayerIds).flatMap((pid) => {
          const winRow  = win.players?.[pid];
          const lossRow = loss.players?.[pid];
          const enoughSample = (winRow?.matchesPlayed ?? 0) >= 2 && (lossRow?.matchesPlayed ?? 0) >= 2;
          if (!enoughSample) return [];
          return PLAYER_SKILLS.map((skill) => {
            const winVal  = winRow[skill.key];
            const lossVal = lossRow[skill.key];
            if (winVal == null || lossVal == null || winVal === lossVal) return null;
            if ((winRow[skill.vol] ?? 0) < skill.min || (lossRow[skill.vol] ?? 0) < skill.min) return null;
            const impactScore = effectSize(winVal, lossVal,
              win.variance?.players?.[pid]?.[skill.key], loss.variance?.players?.[pid]?.[skill.key]);
            return { ...skill, pid, winVal, lossVal, impactScore };
          }).filter(Boolean);
        })
          .sort((a, b) => b.impactScore - a.impactScore)
          .slice(0, 5);

        if (!scoredPlayers.length) return null;

        return (
          <div className="space-y-2.5 pt-1">
            <div className="px-1">
              <p className="text-xs font-black tracking-widest text-slate-500 uppercase">Player Win Factors</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Which player skills change the most between your wins and losses.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {scoredPlayers.map(({ pid, key, label, fmt, higherBetter, winVal, lossVal }) => {
                const currentVal = displayStats?.players?.[pid]?.[key] ?? null;
                const range = winVal - lossVal;
                const pos = currentVal != null && range !== 0 ? (currentVal - lossVal) / range : null;
                const statusColor = pos == null ? 'text-slate-500'
                  : pos >= 0.65 ? 'text-emerald-400'
                  : pos >= 0.35 ? 'text-amber-400'
                  : 'text-red-400';
                const barPct = pos != null ? Math.max(0, Math.min(100, Math.round(pos * 100))) : null;
                const name = playerNames[pid] ?? `#${pid}`;
                // Expected direction = the stat is better in wins (e.g. more kills, fewer errors)
                const expected = higherBetter ? winVal > lossVal : winVal < lossVal;
                const sentence = expected
                  ? `You tend to win when ${name} is at ${fmt(winVal)}, and lose when it's ${fmt(lossVal)}.`
                  : `Surprisingly, ${name}'s ${label.toLowerCase()} has been better in losses than in wins.`;
                return (
                  <div key={`${pid}_${key}`} className="bg-surface rounded-xl p-3.5 border border-slate-700/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-300">{name}</span>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">{label}</span>
                    </div>

                    <div className="flex items-end gap-4 mb-2.5">
                      <div className="flex-1 text-center">
                        <div className="text-lg font-black text-red-400 tabular-nums leading-none">{fmt(lossVal)}</div>
                        <div className="text-[10px] text-red-900 font-bold mt-0.5 tracking-wide">LOSS AVG</div>
                      </div>
                      <div className="flex-1 text-center">
                        <div className={`text-lg font-black tabular-nums leading-none ${statusColor}`}>
                          {currentVal != null ? fmt(currentVal) : '—'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold mt-0.5 tracking-wide">{currentLabel}</div>
                      </div>
                      <div className="flex-1 text-center">
                        <div className="text-lg font-black text-emerald-400 tabular-nums leading-none">{fmt(winVal)}</div>
                        <div className="text-[10px] text-emerald-700 font-bold mt-0.5 tracking-wide">WIN AVG</div>
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
                    <p className="text-xs text-slate-400 mt-2.5 leading-relaxed">{sentence}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
