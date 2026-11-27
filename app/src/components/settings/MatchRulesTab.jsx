import { useState } from 'react';
import { FORMAT } from '../../constants';
import { useDefaultFormat, useLastSetScore, useMaxSubs, DEFAULT_MAX_SUBS } from '../../hooks/useSettingsStorage';

export function MatchRulesTab() {
  const [defaultFormat, saveDefaultFormat] = useDefaultFormat();
  const [lastSetScore,  saveLastSetScore]  = useLastSetScore();
  const [maxSubs,       saveMaxSubs]       = useMaxSubs();
  const [subsDraft, setSubsDraft] = useState(String(maxSubs));
  const commitSubs = (val) => {
    const n = Math.round(Number(val));
    const saved = val === '' || isNaN(n) ? maxSubs : Math.max(1, Math.min(99, n));
    saveMaxSubs(saved);
    setSubsDraft(String(saved));
  };

  return (
    <div className="p-4 space-y-5">
      <div>
        <p className="text-[15px] font-black uppercase tracking-wider text-primary underline underline-offset-4 decoration-2">Match Format</p>
        <p className="text-xs text-slate-400 mt-1">Applied to all future matches.</p>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Best of Sets</label>
        <div className="text-xs text-slate-400 mb-2">How many sets a match is.</div>
        <div className="flex gap-2">
          {[FORMAT.BEST_OF_3, FORMAT.BEST_OF_5].map((f) => (
            <button
              key={f}
              onClick={() => saveDefaultFormat(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                ${defaultFormat === f
                  ? 'bg-primary text-white border-primary'
                  : 'bg-bg text-slate-300 border-slate-600 hover:border-slate-400'
                }`}
            >
              {f === FORMAT.BEST_OF_3 ? 'Best of 3' : 'Best of 5'}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Last Set Plays To</label>
        <div className="text-xs text-slate-400 mb-2">The deciding set win score (sets 1–{defaultFormat === FORMAT.BEST_OF_3 ? '2' : '4'} always play to 25)</div>
        <div className="flex gap-2">
          {[15, 25].map((n) => (
            <button
              key={n}
              onClick={() => saveLastSetScore(n)}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors
                ${lastSetScore === n
                  ? 'bg-primary text-white border-primary'
                  : 'bg-bg text-slate-300 border-slate-600 hover:border-slate-400'
                }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">Max Substitutions per Set</label>
        <div className="flex items-center gap-3">
          <input
            type="number"
            inputMode="numeric"
            className="w-24 bg-bg border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-primary"
            value={subsDraft}
            min={1}
            max={99}
            onChange={(e) => setSubsDraft(e.target.value)}
            onBlur={() => commitSubs(subsDraft)}
          />
          <span className="text-sm text-slate-400">per set</span>
          {maxSubs !== DEFAULT_MAX_SUBS && (
            <button
              className="text-xs text-slate-500 hover:text-slate-300 underline"
              onClick={() => commitSubs(String(DEFAULT_MAX_SUBS))}
            >
              Reset to {DEFAULT_MAX_SUBS}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
