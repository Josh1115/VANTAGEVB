import { useState, useEffect } from 'react';
import { computeWinCorrelation, computeSeasonStats, pickMetricVal } from '../../stats/engine';

const pctFmt = (v) => v != null ? `${Math.round(v * 100)}%` : '—';

const INSIGHT_METRICS = [
  { label: 'Pass Rating',          key: 'apr',         src: 'team',         fmt: (v) => v?.toFixed(2) ?? '—', higherBetter: true  },
  { label: 'Sideout %',            key: 'so_pct',      src: 'rotation',     fmt: pctFmt,                      higherBetter: true  },
  { label: 'Break Point %',        key: 'bp_pct',      src: 'rotation',     fmt: pctFmt,                      higherBetter: true  },
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
  const [data,      setData]      = useState(null);
  const [allStats,  setAllStats]  = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [barsReady, setBarsReady] = useState(false);

  useEffect(() => {
    if (!seasonId) return;
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

  return (
    <div className="space-y-4">
      <div className="px-1">
        <p className="text-xs font-black tracking-widest text-slate-500 uppercase">Win Correlation</p>
        <p className="text-xs text-slate-600 mt-0.5">
          Comparing your stats in {win.matches}W vs {loss.matches}L — metrics that separate wins from losses.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-2.5">
        {INSIGHT_METRICS.map(({ label, key, src, fmt, higherBetter }) => {
          const winVal  = pickMetricVal(src, key, win);
          const lossVal = pickMetricVal(src, key, loss);
          const nowVal  = pickMetricVal(src, key, displayStats);

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
            : pos >= 0.35 ? 'Close — watch this'
            : '✗ Below threshold';

          const barPct = pos != null ? Math.max(0, Math.min(100, Math.round(pos * 100))) : null;

          return (
            <div key={key} className="bg-surface rounded-xl p-3.5 border border-slate-700/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black uppercase tracking-wide text-slate-300">{label}</span>
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
            </div>
          );
        })}
      </div>
    </div>
  );
}
