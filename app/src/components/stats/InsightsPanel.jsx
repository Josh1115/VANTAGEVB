import { useState, useEffect } from 'react';
import { computeWinCorrelation, computeSeasonStats, pickMetricVal, pickMetricVar } from '../../stats/engine';
import { fmtVER } from '../../stats/formatters';
import { Drawer } from '../ui/Drawer';

const INSIGHTS_GLOSSARY = [
  { abbr: 'Win Factors',  full: 'Ranked by impact',         def: 'Metrics are sorted by how strongly they separate the sets you win from the sets you lose, relative to how much that stat normally bounces around set-to-set. A big gap on a stat that\'s usually steady ranks higher than the same-size gap on a stat that swings wildly anyway — a jumpy stat isn\'t a real pattern just because it looks big. Close sets (like 27-25) count more toward these averages than blowout sets, since close sets show what winning actually takes. This looks at individual sets, not whole matches — a set you won inside a match you lost still counts as a win here.' },
  { abbr: 'Confidence',   full: 'How much to trust this',   def: 'Based on how many sets this is built from. Fewer than 5 total sets = Low confidence. Otherwise it\'s Medium, or High once both your winning sets and your losing sets have 10+ each. Insights still calculate normally at Low confidence (once you have at least 2 winning sets and 2 losing sets) — the badge is just a heads-up that a small sample can be luck.' },
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
  { abbr: 'Player Win Factors', full: 'Players who swing outcomes', def: 'Ranks players by how much their overall rating (VER) differs between sets you won and sets you lost. VER already adjusts for position, so a libero and an outside hitter can be compared on the same scale. Only players with at least 2 sets in both your wins and your losses are shown, to avoid one big set looking like a pattern.' },
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
      <p className="text-slate-600 text-sm mt-1">Need at least 2 won sets and 2 lost sets to show win correlations.</p>
    </div>
  );

  const { win, loss } = data;
  const displayStats = currentStats ?? allStats;

  const minSets = Math.min(win.sets, loss.sets);
  const totalSets = win.sets + loss.sets;
  const confidence = totalSets < 5
    ? { label: 'Low confidence',    cls: 'bg-red-400/10 text-red-400 border-red-400/30' }
    : minSets >= 10
    ? { label: 'High confidence',   cls: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/30' }
    : { label: 'Medium confidence', cls: 'bg-amber-400/10 text-amber-400 border-amber-400/30' };

  // Compute impact score for each metric: how much does this stat separate winning sets from
  // losing sets, relative to how much it normally moves around from set to set? A stat
  // that's naturally noisy (high variance) needs a bigger gap to count as a real signal
  // than a stat that's normally rock-steady — this is an effect-size (Cohen's-d-style)
  // comparison, not just a raw percent difference of the two averages.
  const scoredMetrics = INSIGHT_METRICS.map((metric) => {
    const { key, src } = metric;
    const winVal  = pickMetricVal(src, key, win);
    const lossVal = pickMetricVal(src, key, loss);
    if (winVal == null || lossVal == null) return { ...metric, winVal, lossVal, impactScore: -1 };
    const winVar  = pickMetricVar(src, key, win)  ?? 0;
    const lossVar = pickMetricVar(src, key, loss) ?? 0;
    const gap = Math.abs(winVal - lossVal);
    const pooledSd = Math.sqrt((winVar + lossVar) / 2);
    // Floor the denominator relative to the metric's own scale — with only a
    // couple of matches per side, a variance of exactly 0 is a sample-size
    // artifact, not proof the stat is perfectly consistent, so don't let it
    // blow the score up to infinity.
    const scale = (Math.abs(winVal) + Math.abs(lossVal)) / 2 || 1;
    const denom = Math.max(pooledSd, scale * 0.05);
    const impactScore = gap / denom;
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
            Ranked by impact — stats that most separate the sets you win from the sets you lose ({win.sets}W / {loss.sets}L sets).
          </p>
          <span className={`inline-block mt-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md border tracking-wide ${confidence.cls}`}>
            {confidence.label} · {win.sets}W / {loss.sets}L sets
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
        const scoredPlayers = Array.from(allPlayerIds).map((pid) => {
          const winRow  = win.players?.[pid];
          const lossRow = loss.players?.[pid];
          const winVal  = winRow?.ver ?? null;
          const lossVal = lossRow?.ver ?? null;
          const enoughSample = (winRow?.setsPlayed ?? 0) >= 2 && (lossRow?.setsPlayed ?? 0) >= 2;
          if (winVal == null || lossVal == null || !enoughSample) return null;
          return { pid, winVal, lossVal, impactScore: Math.abs(winVal - lossVal) };
        }).filter(Boolean)
          .sort((a, b) => b.impactScore - a.impactScore)
          .slice(0, 5);

        if (!scoredPlayers.length) return null;

        return (
          <div className="space-y-2.5 pt-1">
            <div className="px-1">
              <p className="text-xs font-black tracking-widest text-slate-500 uppercase">Player Win Factors</p>
              <p className="text-xs text-slate-600 mt-0.5">
                Whose overall rating (VER) swings the most between your wins and losses.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-2.5">
              {scoredPlayers.map(({ pid, winVal, lossVal }) => {
                const currentVal = displayStats?.players?.[pid]?.ver ?? null;
                const range = winVal - lossVal;
                const pos = currentVal != null && range !== 0 ? (currentVal - lossVal) / range : null;
                const statusColor = pos == null ? 'text-slate-500'
                  : pos >= 0.65 ? 'text-emerald-400'
                  : pos >= 0.35 ? 'text-amber-400'
                  : 'text-red-400';
                const barPct = pos != null ? Math.max(0, Math.min(100, Math.round(pos * 100))) : null;
                const name = playerNames[pid] ?? `#${pid}`;
                return (
                  <div key={pid} className="bg-surface rounded-xl p-3.5 border border-slate-700/40">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase tracking-wide text-slate-300">{name}</span>
                      <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">VER</span>
                    </div>

                    <div className="flex items-end gap-4 mb-2.5">
                      <div className="flex-1 text-center">
                        <div className="text-lg font-black text-red-400 tabular-nums leading-none">{fmtVER(lossVal)}</div>
                        <div className="text-[10px] text-red-900 font-bold mt-0.5 tracking-wide">LOSS AVG</div>
                      </div>
                      <div className="flex-1 text-center">
                        <div className={`text-lg font-black tabular-nums leading-none ${statusColor}`}>
                          {currentVal != null ? fmtVER(currentVal) : '—'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-bold mt-0.5 tracking-wide">{currentLabel}</div>
                      </div>
                      <div className="flex-1 text-center">
                        <div className="text-lg font-black text-emerald-400 tabular-nums leading-none">{fmtVER(winVal)}</div>
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
