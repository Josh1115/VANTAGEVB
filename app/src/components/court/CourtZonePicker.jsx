export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];

// Visual cell order (top-left → bottom-right) → zone number
// Front row: 4 | 3 | 2     Back row: 5 | 6 | 1
export const ZONE_VISUAL = [4, 3, 2, 5, 6, 1];

// Given serve order k (0-based) and the zone where Player I starts,
// return which court zone that player occupies.
export function serveOrderToZone(serveOrderIdx, startZone) {
  return ((startZone - 1 + serveOrderIdx) % 6) + 1;
}

export function CourtZonePicker({ value, onChange, serveOrder, players }) {
  const zoneInfo = {};
  ROMAN.forEach((r, i) => {
    const zone = serveOrderToZone(i, value);
    const pid  = serveOrder[i];
    const p    = pid ? (players ?? []).find((pl) => String(pl.id) === String(pid)) : null;
    zoneInfo[zone] = { roman: r, playerName: p ? `#${p.jersey_number} ${p.name.split(' ').pop()}` : null };
  });

  return (
    <div>
      <div className="text-center mb-1">
        <span className="text-[1.3vmin] text-slate-400 uppercase tracking-wide font-semibold">← Net</span>
      </div>
      <div className="grid grid-cols-3 grid-rows-2 gap-px bg-slate-700 rounded-lg overflow-hidden">
        {ZONE_VISUAL.map((zone) => {
          const info    = zoneInfo[zone] ?? {};
          const isIHere = zone === value;
          return (
            <button
              key={zone}
              type="button"
              onClick={() => onChange(zone)}
              className={`h-14 flex flex-col items-center justify-center gap-0.5 text-xs font-bold transition-colors
                ${isIHere ? 'bg-orange-700/80 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
            >
              <span className={`text-[2.0vmin] font-black leading-none ${isIHere ? 'text-orange-200' : 'text-slate-500'}`}>
                {info.roman}
              </span>
              {info.playerName
                ? <span className="text-[1.2vmin] leading-none text-slate-300 px-0.5 text-center">{info.playerName}</span>
                : <span className="text-[1.2vmin] leading-none text-slate-600">—</span>
              }
            </button>
          );
        })}
      </div>
      <div className="text-center mt-1">
        <span className="text-[1.3vmin] text-slate-400 uppercase tracking-wide font-semibold">Bench →</span>
      </div>
    </div>
  );
}
