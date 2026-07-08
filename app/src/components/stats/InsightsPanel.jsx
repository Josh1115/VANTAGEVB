import { useState, useEffect } from 'react';
import { computeWinCorrelation, computeSeasonStats, pickMetricVal } from '../../stats/engine';
import { Drawer } from '../ui/Drawer';

const INSIGHTS_GLOSSARY = [
  { abbr: 'Win Factors',  full: 'Ranked by impact',         def: 'Metrics are sorted by how strongly they separate your wins from losses. The #1 stat has the biggest gap between your win average and loss average — focus here first.' },
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
export function InsightsPanel({ seasonId, currentStats = null, currentLabel = 'THIS SEASON' }) {
  const [data,         setData]         = useState(null);
  const [allStats,     setAllStats]     = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [barsReady,    setBarsReady]    = useState(false);
  const [glossaryOpen, setGlossaryOpen] = useState(false);

  useEffect(() => {
    if (!seasonId) return;
    setData(null);
    setAllStats(null);
    setLoading(true);
    setBarsReady(false);
    const tasks = currentStats
      ? [computeWinCorrelation(Number(seasonId))]
      : [computeWinCorrelation(Number(seasonId)), computeSeasonStats(Number(seasonId), {})];
    Promise.all(tasks)
      .then(([corr, season]) => { setData(corr); setAllStats(season ?? null); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [seasonId]);

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

  // Compute impact score for each metric: how much does this stat separate wins from losses?
  const scoredMetrics = INSIGHT_METRICS.map((metric) => {
    const { key, src, higherBetter } = metric;
    const winVal  = pickMetricVal(src, key, win);
    const lossVal = pickMetricVal(src, key, loss);
    if (winVal == null || lossVal == null) return { ...metric, winVal, lossVal, impactScore: -1 };
    const wv  = higherBetter ? winVal  : -winVal;
    const lv  = higherBetter ? lossVal : -lossVal;
    const avg = (Math.abs(wv) + Math.abs(lv)) / 2;
    const impactScore = avg > 0 ? Math.abs(wv - lv) / avg : 0;
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
              {(() => {
                const share = totalImpact > 0 ? Math.round((impactScore / totalImpact) * 100) : 0;
                return (
                  <div className="mt-3 pt-3 border-t border-slate-700/50">
                    <span className="text-[13.8px] font-bold text-white uppercase tracking-wide">Win Factor: </span>
                    <span className="text-[13.8px] font-black text-blue-400">{share}%</span>
                  </div>
                );
              })()}
            </div>
          );
        })}
      </div>
    </div>
  );
}
