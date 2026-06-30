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
        <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 uppercase tracking-widest">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Live
        </span>
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
          <div className="mt-2 flex justify-center">
            <div className="border-2 border-orange-500 rounded px-3 py-0.5 bg-orange-950/30">
              <span className="text-base font-black tabular-nums text-orange-400 leading-none" style={{ fontFamily: "'Orbitron', sans-serif" }}>{ourSetsWon}</span>
            </div>
          </div>
        </div>

        {/* Divider — set number above dash */}
        <div className="flex flex-col items-center gap-0.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Set {setNumber}</span>
          <span className="text-2xl text-slate-600 font-light leading-none">—</span>
        </div>

        {/* Them */}
        <div className="flex-1 text-center">
          <div className="text-xs text-slate-400 truncate mb-1">{opponentName ?? 'Opponent'}</div>
          <div className="flex items-center justify-center gap-1.5">
            {serveSide === 'them' && (
              <span className="text-slate-400 text-lg leading-none">▶</span>
            )}
            <span className="text-5xl font-black tabular-nums text-slate-300 leading-none">{oppScore}</span>
          </div>
          <div className="mt-2 flex justify-center">
            <div className="border-2 border-slate-500 rounded px-3 py-0.5 bg-slate-800/40">
              <span className="text-base font-black tabular-nums text-slate-300 leading-none" style={{ fontFamily: "'Orbitron', sans-serif" }}>{oppSetsWon}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
