export function LiveScoreBoard({ liveData, teamName, opponentName }) {
  const {
    ourScore = 0, oppScore = 0,
    ourSetsWon = 0, oppSetsWon = 0,
    setNumber = 1, serveSide,
  } = liveData;

  const setBox = (count, orange) => (
    <div className={`border-2 rounded px-2.5 py-0.5 ${orange ? 'border-orange-500 bg-orange-950/30' : 'border-slate-500 bg-slate-800/40'}`}>
      <span className={`text-base font-black tabular-nums leading-none ${orange ? 'text-orange-400' : 'text-slate-300'}`} style={{ fontFamily: "'Orbitron', sans-serif" }}>{count}</span>
    </div>
  );

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-2">
      {/* Live badge */}
      <div className="flex items-center gap-2 mb-1">
        <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Live
        </span>
      </div>

      {/* Team names row */}
      <div className="flex items-center justify-center gap-6">
        <div className="flex-1 text-center">
          <div className="text-xs text-slate-400 truncate">{teamName ?? 'Us'}</div>
        </div>
        <div className="w-16" />
        <div className="flex-1 text-center">
          <div className="text-xs text-slate-400 truncate">{opponentName ?? 'Opponent'}</div>
        </div>
      </div>

      {/* Scores row — set boxes on outer edges */}
      <div className="flex items-center justify-center gap-3">
        {/* Home set wins — far left */}
        {setBox(ourSetsWon, true)}

        {/* Home score */}
        <div className="flex-1 flex items-center justify-end gap-1.5">
          {serveSide === 'us' && (
            <span className="text-primary text-lg leading-none">▶</span>
          )}
          <span className="text-5xl font-black tabular-nums text-white leading-none">{ourScore}</span>
        </div>

        {/* Divider */}
        <div className="flex flex-col items-center gap-0.5 shrink-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Set {setNumber}</span>
          <span className="text-2xl text-slate-600 font-light leading-none">—</span>
        </div>

        {/* Away score */}
        <div className="flex-1 flex items-center justify-start gap-1.5">
          <span className="text-5xl font-black tabular-nums text-slate-300 leading-none">{oppScore}</span>
          {serveSide === 'them' && (
            <span className="text-slate-400 text-lg leading-none">▶</span>
          )}
        </div>

        {/* Away set wins — far right */}
        {setBox(oppSetsWon, false)}
      </div>
    </div>
  );
}
