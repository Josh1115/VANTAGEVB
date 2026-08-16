import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  findDuplicatePlayerGroups, pickDefaultPlayerWinner, mergePlayerGroup,
  findDuplicateOpponentGroups, pickDefaultOpponentWinner, mergeOpponentGroup,
  findLikelyDuplicateMatches,
} from '../../stats/dedupe';

function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function PlayerGroupRow({ group, winnerId, onPick }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-400">{group[0].name} · {group.length} copies found</p>
      <div className="flex flex-col gap-1.5">
        {group.map(p => (
          <button
            key={p.id}
            onClick={() => onPick(p.id)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors ${
              winnerId === p.id ? 'bg-primary/15 border border-primary/40 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>#{p.jersey_number || '—'} {p.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide">{winnerId === p.id ? 'Keep this one' : 'Fold into winner'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function OpponentGroupRow({ group, winnerId, onPick }) {
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl p-3 space-y-2">
      <p className="text-xs font-semibold text-slate-400">{group[0].name} · {group.length} copies found</p>
      <div className="flex flex-col gap-1.5">
        {group.map(o => (
          <button
            key={o.id}
            onClick={() => onPick(o.id)}
            className={`flex items-center justify-between px-3 py-2 rounded-lg text-left text-sm transition-colors ${
              winnerId === o.id ? 'bg-primary/15 border border-primary/40 text-white' : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>{o.name}</span>
            <span className="text-[10px] font-bold uppercase tracking-wide">{winnerId === o.id ? 'Keep this one' : 'Fold into winner'}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function DedupeModal({ onClose }) {
  const [phase,         setPhase]         = useState('loading'); // loading | review | merging | done
  const [playerGroups,  setPlayerGroups]  = useState([]);
  const [oppGroups,     setOppGroups]     = useState([]);
  const [matchDupes,    setMatchDupes]    = useState([]);
  const [playerWinners, setPlayerWinners] = useState({}); // groupIndex -> player id
  const [oppWinners,    setOppWinners]    = useState({}); // groupIndex -> opponent id
  const [error,         setError]         = useState(null);
  const [summary,       setSummary]       = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const [pGroups, oGroups, mDupes] = await Promise.all([
          findDuplicatePlayerGroups(),
          findDuplicateOpponentGroups(),
          findLikelyDuplicateMatches(),
        ]);
        setPlayerGroups(pGroups);
        setOppGroups(oGroups);
        setMatchDupes(mDupes);
        setPlayerWinners(Object.fromEntries(pGroups.map((g, i) => [i, pickDefaultPlayerWinner(g).id])));
        setOppWinners(Object.fromEntries(oGroups.map((g, i) => [i, pickDefaultOpponentWinner(g).id])));
        setPhase('review');
      } catch (err) {
        setError(err.message ?? 'Failed to scan for duplicates.');
        setPhase('review');
      }
    })();
  }, []);

  async function handleMergeAll() {
    setPhase('merging');
    try {
      let playersMerged = 0, oppsMerged = 0;
      for (let i = 0; i < playerGroups.length; i++) {
        await mergePlayerGroup(playerGroups[i], playerWinners[i]);
        playersMerged += playerGroups[i].length - 1;
      }
      for (let i = 0; i < oppGroups.length; i++) {
        await mergeOpponentGroup(oppGroups[i], oppWinners[i]);
        oppsMerged += oppGroups[i].length - 1;
      }
      setSummary({ playersMerged, oppsMerged });
      setPhase('done');
    } catch (err) {
      setError(err.message ?? 'Merge failed.');
      setPhase('review');
    }
  }

  const nothingToMerge = playerGroups.length === 0 && oppGroups.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700 flex-shrink-0">
        <span className="font-bold text-white">Clean Up Duplicates</span>
        <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">

        {phase === 'loading' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Scanning for duplicates…</p>
          </div>
        )}

        {phase === 'review' && (
          <>
            {error && (
              <div className="bg-red-900/40 border border-red-700 rounded-xl px-4 py-3 text-sm text-red-300">{error}</div>
            )}

            {nothingToMerge && matchDupes.length === 0 && (
              <div className="bg-slate-800 rounded-xl p-4 text-center text-sm text-slate-400">
                No duplicates found. Everything looks clean.
              </div>
            )}

            {playerGroups.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Duplicate Players — pick which copy to keep
                </p>
                <p className="text-[11px] text-slate-500">
                  Stats, lineups, and substitutions from the other copy move onto the one you keep — nothing is lost.
                </p>
                {playerGroups.map((g, i) => (
                  <PlayerGroupRow
                    key={i}
                    group={g}
                    winnerId={playerWinners[i]}
                    onPick={(id) => setPlayerWinners(w => ({ ...w, [i]: id }))}
                  />
                ))}
              </div>
            )}

            {oppGroups.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Duplicate Opponents — pick which copy to keep
                </p>
                {oppGroups.map((g, i) => (
                  <OpponentGroupRow
                    key={i}
                    group={g}
                    winnerId={oppWinners[i]}
                    onPick={(id) => setOppWinners(w => ({ ...w, [i]: id }))}
                  />
                ))}
              </div>
            )}

            {matchDupes.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-black uppercase tracking-widest text-slate-500">
                  Possible Duplicate Matches — review manually
                </p>
                <p className="text-[11px] text-slate-500">
                  These share a team/season and date. Matches carry live stats, so they aren't merged
                  automatically — open one below and delete it yourself if it's a real duplicate.
                </p>
                {matchDupes.map((d, i) => (
                  <div key={i} className="bg-slate-900 border border-amber-700/40 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-slate-400">{d.teamName} · {d.seasonYear}</p>
                    {d.matches.map(m => (
                      <Link
                        key={m.id}
                        to={`/matches/${m.id}/summary`}
                        className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2 hover:bg-slate-700"
                      >
                        <span className="text-sm text-slate-200 truncate">{m.opponentName}</span>
                        <span className="text-xs text-slate-500 shrink-0">{fmtDate(m.date)} · {m.setCount} sets · {m.status}</span>
                      </Link>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {phase === 'merging' && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-slate-400">Merging…</p>
          </div>
        )}

        {phase === 'done' && summary && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-8 gap-3">
              <span className="text-5xl">✅</span>
              <p className="text-lg font-bold text-white">Cleanup Complete</p>
            </div>
            <div className="bg-slate-800 rounded-xl p-4 space-y-2">
              <p className="text-sm text-slate-300"><span className="font-bold text-emerald-400">{summary.playersMerged}</span> duplicate player {summary.playersMerged === 1 ? 'row' : 'rows'} merged</p>
              <p className="text-sm text-slate-300"><span className="font-bold text-emerald-400">{summary.oppsMerged}</span> duplicate opponent {summary.oppsMerged === 1 ? 'row' : 'rows'} merged</p>
              <p className="text-[11px] text-slate-500 pt-1">Don't forget to Save to Cloud afterward so every device picks up the cleaned-up data.</p>
            </div>
            <button onClick={onClose} className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm">Done</button>
          </div>
        )}

      </div>

      {phase === 'review' && !nothingToMerge && (
        <div className="flex-shrink-0 border-t border-slate-700 p-4">
          <button onClick={handleMergeAll} className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm">
            Merge {playerGroups.length + oppGroups.length} {playerGroups.length + oppGroups.length === 1 ? 'Group' : 'Groups'}
          </button>
        </div>
      )}
    </div>
  );
}
