export function LiveScoreBoard({ liveData, teamName, opponentName }) {
  const {
    ourScore = 0, oppScore = 0,
    ourSetsWon = 0, oppSetsWon = 0,
    setNumber = 1, serveSide,
  } = liveData;

  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-2">
      {/* Live badge */}
      <div className="flex items-center gap-2 mb-1">
        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
        <span className="text-xs text-slate-400">Set {setNumber}</span>
      </div>

      {/* Scores */}
      <div className="flex items-center justify-center gap-6">
        {/* Us */}
        <div className="flex-1 text-center">
          <div className="text-xs text-slate-400 truncate mb-1">{teamName ?? 'Us'}</div>
          <div className="flex items-center justify-center gap-1.5">
            {serveSide === 'us' && (
              <span className="text-primary text-lg leading-none">▶</span>
            )}
            <span className="text-5xl font-black tabular-nums text-white leading-none">{ourScore}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {Array.from({ length: ourSetsWon }).map((_, i) => (
              <span key={i} className="text-primary">●</span>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="text-2xl text-slate-600 font-light">—</div>

        {/* Them */}
        <div className="flex-1 text-center">
          <div className="text-xs text-slate-400 truncate mb-1">{opponentName ?? 'Opponent'}</div>
          <div className="flex items-center justify-center gap-1.5">
            {serveSide === 'them' && (
              <span className="text-slate-400 text-lg leading-none">▶</span>
            )}
            <span className="text-5xl font-black tabular-nums text-slate-300 leading-none">{oppScore}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {Array.from({ length: oppSetsWon }).map((_, i) => (
              <span key={i} className="text-slate-400">●</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
