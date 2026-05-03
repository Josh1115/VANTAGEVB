import { fmtCount, fmtPct, fmtHitting, fmtPassRating, fmtBlocks } from '../../stats/formatters';

// oppKey = field name on the opp object (from computeOppDisplayStats), or null if not tracked
// lowerBetter = true for error stats where lower is the winning side
// isRate = true for percentages/ratings that should not be divided in avg views
const TEAM_COMPARE_STATS = [
  { key: 'k',       oppKey: 'k',   label: 'Kills',        fmt: fmtCount,       lowerBetter: false },
  { key: 'ae',      oppKey: 'ae',  label: 'Atk Errors',   fmt: fmtCount,       lowerBetter: true  },
  { key: 'hit_pct', oppKey: null,  label: 'HIT%',         fmt: fmtHitting,     lowerBetter: false, isRate: true },
  { key: 'ace',     oppKey: 'ace', label: 'Aces',         fmt: fmtCount,       lowerBetter: false },
  { key: 'se',      oppKey: 'se',  label: 'Serve Errors', fmt: fmtCount,       lowerBetter: true  },
  { key: 'ace_pct', oppKey: null,  label: 'ACE%',         fmt: fmtPct,         lowerBetter: false, isRate: true },
  { key: 'dig',     oppKey: null,  label: 'Digs',         fmt: fmtCount,       lowerBetter: false },
  { key: 'pa',      oppKey: null,  label: 'Receptions',   fmt: fmtCount,       lowerBetter: false },
  { key: 'apr',     oppKey: null,  label: 'APR',          fmt: fmtPassRating,  lowerBetter: false, isRate: true },
  { key: 'blk',     oppKey: 'blk', label: 'Blocks',       fmt: fmtBlocks,      lowerBetter: false },
];

function StatBar({ v1, v2 }) {
  if (v1 == null || v2 == null) return null;
  const max = Math.max(v1, v2);
  if (!max) return null;
  const pct1 = Math.round(v1 / max * 100);
  const pct2 = Math.round(v2 / max * 100);
  return (
    <div className="flex gap-0.5 h-1 rounded-full overflow-hidden bg-slate-800 my-1">
      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct1}%` }} />
      <div className="flex-1" />
      <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: `${pct2}%` }} />
    </div>
  );
}

const fmtAvg1 = (v) => v == null ? '—' : v.toFixed(1);

export function TeamComparison({ team, opp, teamName = 'Us', oppName = 'Opponent', divisor = 1 }) {
  if (!team || !opp) return null;

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1 rounded-xl p-3 text-center bg-primary/15 border border-primary/30">
          <div className="font-bold text-sm">{teamName}</div>
        </div>
        <span className="self-center text-slate-500 font-bold text-sm">vs</span>
        <div className="flex-1 rounded-xl p-3 text-center bg-amber-400/10 border border-amber-400/30">
          <div className="font-bold text-sm">{oppName}</div>
        </div>
      </div>

      <div className="bg-surface rounded-xl overflow-hidden">
        {TEAM_COMPARE_STATS.map(({ key, oppKey, label, fmt, lowerBetter, isRate }) => {
          const raw1 = team[key];
          const raw2 = oppKey != null ? opp[oppKey] : null;
          const v1 = (!isRate && divisor > 1 && raw1 != null) ? raw1 / divisor : raw1;
          const v2 = (!isRate && divisor > 1 && raw2 != null) ? raw2 / divisor : raw2;
          const useFmt = (!isRate && divisor > 1) ? fmtAvg1 : fmt;
          const f1 = useFmt(v1);
          const f2 = v2 != null ? useFmt(v2) : '—';
          if (f1 === '—' && f2 === '—') return null;
          const n1 = v1 ?? 0;
          const n2 = v2 ?? 0;
          const hasBoth = v1 != null && v2 != null;
          const better1 = hasBoth && (lowerBetter ? n1 < n2 : n1 > n2);
          const better2 = hasBoth && (lowerBetter ? n2 < n1 : n2 > n1);
          return (
            <div key={key} className="px-3 py-2 border-b border-slate-700/50 last:border-0">
              <div className="flex items-center">
                <span className={`w-16 text-right text-sm font-bold tabular-nums ${better1 ? 'text-primary' : 'text-slate-300'}`}>{f1}</span>
                <span className="flex-1 text-center text-xs text-slate-400 px-2">{label}</span>
                <span className={`w-16 text-left text-sm font-bold tabular-nums ${better2 ? 'text-amber-400' : 'text-slate-300'}`}>{f2}</span>
              </div>
              <StatBar v1={hasBoth ? n1 : null} v2={hasBoth ? n2 : null} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
