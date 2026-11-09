import { Fragment } from 'react';
import { MAX_PLAYOFF_SETS } from '../../utils/seasonUtils';

const SET_SCORE_WIDTH_PX = 52; // one set score in the list's 12px font, plus its "·" divider
const SET_NUMBERS = Array.from({ length: MAX_PLAYOFF_SETS }, (_, i) => i);

// Two rows of score boxes, one column per set. Typed values stay as text until the
// season is saved (see readSetScores).
export function SetScoresInput({ value, onChange, inputClassName = '' }) {
  const update = (index, side, text) => {
    const next = SET_NUMBERS.map(i => ({ us: value?.[i]?.us ?? '', opp: value?.[i]?.opp ?? '' }));
    next[index][side] = text.replace(/\D/g, '').slice(0, 2);
    onChange(next);
  };

  const boxes = (side, label) => SET_NUMBERS.map(i => (
    <input
      key={i}
      aria-label={`${label} score, set ${i + 1}`}
      inputMode="numeric"
      className={`${inputClassName} text-center tabular-nums`}
      style={{ paddingLeft: 2, paddingRight: 2 }}
      value={value?.[i]?.[side] ?? ''}
      onChange={e => update(i, side, e.target.value)}
    />
  ));

  return (
    <div className="grid grid-cols-[2.25rem_repeat(5,minmax(0,1fr))] items-center gap-1">
      <span className="text-[10px] font-bold text-slate-400">SET</span>
      {SET_NUMBERS.map(i => (
        <span key={i} className="text-center text-[10px] font-bold text-slate-400">{i + 1}</span>
      ))}
      <span className="text-[10px] font-bold text-slate-300">US</span>
      {boxes('us', 'Our')}
      <span className="text-[10px] font-bold text-slate-300">OPP</span>
      {boxes('opp', 'Opponent')}
    </div>
  );
}

// Saved set scores, ours first, styled like the dashboard: plain score text with a
// short green (won) or red (lost) bar under each set. Each score takes the same
// width so sets line up from one round to the next.
function SetScoresLine({ scores }) {
  if (!scores?.length) return null;
  return (
    <span className="flex min-w-0 items-center gap-x-1 overflow-x-auto whitespace-nowrap font-mono text-slate-300">
      {scores.map((s, i) => (
        <span key={i} className="inline-flex items-center gap-x-1">
          {i > 0 && <span className="text-slate-500">·</span>}
          <span title={`Set ${i + 1}`} className="flex min-w-[5ch] flex-col items-center">
            <span>{s.us}-{s.opp}</span>
            <span className={`mt-0.5 h-px w-3 rounded-full ${s.us > s.opp ? 'bg-emerald-500' : s.us < s.opp ? 'bg-red-500' : 'bg-slate-500'}`} />
          </span>
        </span>
      ))}
    </span>
  );
}

// A season's playoff rounds in shared columns, so each field starts in the same place
// on every row. The seed and set score columns only exist if some round uses them.
export function PlayoffRoundsList({ rounds }) {
  const hasSeeds = rounds.some(r => r.opp_seed);
  const maxSets = Math.max(0, ...rounds.map(r => r.set_scores?.length ?? 0));
  const hasSets = maxSets > 0;
  const columns = [
    'max-content',
    'max-content',
    hasSeeds && 'max-content',
    'minmax(2rem, max-content)',
    'max-content',
    // Room for three whole sets is held back from long opponent names. A fourth or
    // fifth set can scroll sideways if the row runs out of room.
    hasSets && `minmax(${Math.min(maxSets, 3) * SET_SCORE_WIDTH_PX}px, max-content)`,
  ].filter(Boolean).join(' ');

  return (
    <div className="grid items-center justify-start gap-x-3 gap-y-1 overflow-x-auto text-xs" style={{ gridTemplateColumns: columns }}>
      {rounds.map((r, i) => (
        <Fragment key={i}>
          <span className="mr-1.5 whitespace-nowrap text-slate-400 font-semibold">{r.round || '—'}</span>
          <span className={`text-center font-black px-1.5 py-0.5 rounded ${r.result === 'W' ? 'bg-emerald-900/60 text-emerald-400' : 'bg-red-900/60 text-red-400'}`}>
            {r.result}
          </span>
          {hasSeeds && (
            <span className="text-right font-bold text-amber-400 tabular-nums" title="Playoff seed">
              {r.opp_seed ? String(r.opp_seed).replace('#', '') : ''}
            </span>
          )}
          <span className="truncate text-slate-300">{r.opponent || '—'}</span>
          <span className="text-slate-400 font-mono">{r.score ? `(${r.score})` : ''}</span>
          {hasSets && <SetScoresLine scores={r.set_scores} />}
          {hasSets && !r.set_scores?.length && <span />}
        </Fragment>
      ))}
    </div>
  );
}
