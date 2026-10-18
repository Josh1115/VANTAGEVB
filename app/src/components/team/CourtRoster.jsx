import { SwipeableMatchCard } from '../ui/SwipeableMatchCard';

// Court-shaped roster for the "Position" view. Net on top; front row OH | MB | OPP/RS,
// back row L/DS | (empty) | S. Players with no position listed underneath.
const CELLS = [
  { key: 'OH',  label: 'Outsides' },
  { key: 'MB',  label: 'Middles' },
  { key: 'OPP', label: 'Opp / RS' },
  { key: 'LDS', label: 'Lib / DS' },
  { key: null },
  { key: 'S',   label: 'Setters' },
];

function MiniCard({ player, onOpen, onEdit, onDelete }) {
  const card = (
    <div
      className="bg-surface rounded-lg pl-1.5 pr-1 py-1.5 flex items-center gap-1.5 cursor-pointer active:brightness-110"
      onClick={() => onOpen(player)}
    >
      <span className="font-mono font-bold text-primary text-xs shrink-0">#{player.jersey_number}</span>
      <span className="flex-1 min-w-0 text-xs font-semibold truncate">
        {player.name}
        {player.is_captain && <span className="ml-1 font-bold text-yellow-400">C</span>}
      </span>
      {onEdit && (
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(player); }}
          className="text-slate-500 hover:text-white shrink-0 p-0.5"
          aria-label="Edit player"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
          </svg>
        </button>
      )}
    </div>
  );
  return onDelete
    ? <SwipeableMatchCard onDeleteConfirm={() => onDelete(player)}>{card}</SwipeableMatchCard>
    : card;
}

export function CourtRoster({ groups, onOpen, onEdit, onDelete }) {
  const byKey = Object.fromEntries(groups.map(g => [g.key, g.players]));
  const other = byKey.other ?? [];
  const cardProps = { onOpen, onEdit, onDelete };

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 h-0.5 bg-slate-500" />
        <span className="text-[10px] font-bold tracking-widest text-slate-400">NET</span>
        <div className="flex-1 h-0.5 bg-slate-500" />
      </div>
      <div className="grid grid-cols-3 border border-slate-700 rounded-lg overflow-hidden">
        {CELLS.map((c, i) => {
          const list = c.key ? (byKey[c.key] ?? []) : [];
          return (
            <div
              key={c.key ?? `empty${i}`}
              className={`p-1.5 space-y-1.5 min-h-[72px] min-w-0 ${i % 3 !== 2 ? 'border-r' : ''} ${i < 3 ? 'border-b border-dashed' : ''} border-slate-700`}
            >
              {c.key && (
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                  {c.label} <span className="text-slate-500">({list.length})</span>
                </div>
              )}
              {list.map(p => <MiniCard key={p.id} player={p} {...cardProps} />)}
            </div>
          );
        })}
      </div>
      {other.length > 0 && (
        <div className="mt-4 space-y-1.5">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-400">
            Other <span className="text-slate-500">({other.length})</span>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {other.map(p => <MiniCard key={p.id} player={p} {...cardProps} />)}
          </div>
        </div>
      )}
    </div>
  );
}
