import { useEffect, useRef } from 'react';

export function LiveFeed({ events }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events.length]);

  if (!events.length) return null;

  return (
    <div className="bg-slate-800/60 rounded-xl overflow-hidden">
      <div className="px-3 py-2 border-b border-slate-700/50 text-xs text-slate-400 font-semibold uppercase tracking-wider">
        Rally Feed
      </div>
      <div className="max-h-48 overflow-y-auto px-3 py-2 space-y-1">
        {events.map((ev, i) => (
          <div
            key={ev.id ?? i}
            className="flex items-center gap-2 text-sm py-0.5 animate-fade-in"
          >
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
              ev.label?.startsWith('+1') ? 'bg-emerald-400' : 'bg-slate-500'
            }`} />
            <span className="text-slate-200">{ev.label}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
