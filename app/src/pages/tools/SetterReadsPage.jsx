import { useEffect, useState } from 'react';
import { PageHeader } from '../../components/layout/PageHeader';

const SET_TYPES = [
  '4', 'SHOOT (OH)', '3-2', 'GAP', '3-1', 'A', 'B', 'C', '1', 'QUICK',
  'BACK 1', '2', 'FLARE', 'SLIDE', '9', 'FLAT', 'PIPE', 'BIC',
  'DUMP (BACK)', 'DUMP (ATTACK)', 'DUMP (DEEP)',
];

function pickNext(pool, current) {
  if (pool.length <= 1) return pool[0];
  let next = current;
  while (next === current) {
    next = pool[Math.floor(Math.random() * pool.length)];
  }
  return next;
}

// ─── Setup screen ─────────────────────────────────────────────────────────────

function SetupView({ onStart }) {
  const [checked, setChecked] = useState(new Set(SET_TYPES));
  const allOn = checked.size === SET_TYPES.length;

  function toggle(type) {
    setChecked((prev) => {
      const next = new Set(prev);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    });
  }

  return (
    <div className="p-4 space-y-4">
      <div className="bg-surface rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs text-slate-400 uppercase tracking-wide font-semibold">Set Types</span>
          <button
            onClick={() => setChecked(allOn ? new Set() : new Set(SET_TYPES))}
            className="text-xs text-primary font-semibold"
          >
            {allOn ? 'Deselect all' : 'Select all'}
          </button>
        </div>
        <div className="p-3 flex flex-wrap gap-2">
          {SET_TYPES.map((type) => {
            const on = checked.has(type);
            return (
              <button
                key={type}
                onClick={() => toggle(type)}
                className={`rounded-lg px-3 py-2 text-sm font-bold border active:scale-95 transition-transform ${
                  on
                    ? 'bg-primary border-primary text-white'
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                {type}
              </button>
            );
          })}
        </div>
      </div>

      {checked.size > 0 && (
        <button
          onClick={() => onStart(SET_TYPES.filter((t) => checked.has(t)))}
          className="w-full bg-primary rounded-xl p-4 font-bold text-white text-base active:scale-[0.97] transition-transform"
        >
          Go · {checked.size} set type{checked.size !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}

// ─── Live screen ───────────────────────────────────────────────────────────────

function LiveView({ pool, onEnd }) {
  const [current, setCurrent]   = useState(() => pool[Math.floor(Math.random() * pool.length)]);
  const [screenH, setScreenH]   = useState(window.innerHeight);
  const [isPortrait, setIsPortrait] = useState(() => window.matchMedia('(orientation: portrait)').matches);

  useEffect(() => {
    // Lock to landscape; release on unmount
    screen.orientation?.lock?.('landscape').catch(() => {});
    return () => screen.orientation?.unlock?.();
  }, []);

  useEffect(() => {
    const update = () => setScreenH(window.innerHeight);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  // Detect portrait orientation (Safari on iPad ignores orientation lock)
  useEffect(() => {
    const mq = window.matchMedia('(orientation: portrait)');
    const handler = (e) => setIsPortrait(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return (
    <div className="w-screen relative flex flex-col bg-slate-950 overflow-hidden" style={{ height: screenH }}>
      {isPortrait ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8">
          <span className="text-5xl">🔄</span>
          <p className="text-center text-slate-400 font-semibold">Rotate your device to landscape to use Setter Reads</p>
          <button
            onClick={onEnd}
            className="text-sm text-slate-500 font-semibold px-4 py-2"
          >
            ← End Session
          </button>
        </div>
      ) : (
        <>
          <div className="absolute top-0 inset-x-0 z-10 flex items-center justify-between px-5 pt-safe pb-1">
            <button
              onClick={onEnd}
              className="text-white text-[1.3125rem] font-bold px-3 py-1.5 border border-slate-500 rounded-lg"
            >
              ✕ End
            </button>
            <span className="text-xs text-slate-600 uppercase tracking-widest font-semibold">Setter Reads</span>
            <span className="w-12" />
          </div>

          <div className="absolute inset-0 flex items-center justify-center px-6 pointer-events-none">
            <span className="text-white font-black uppercase tracking-wide leading-none text-center text-[min(51.5625vw,23.4375rem)]">
              {current}
            </span>
          </div>

          <div className="absolute bottom-0 inset-x-0 z-10 px-6 pb-safe pb-8">
            <button
              onClick={() => setCurrent((prev) => pickNext(pool, prev))}
              className="w-full py-[0.9211875rem] rounded-2xl bg-primary text-white font-black tracking-wide text-xl active:scale-[0.98] transition-transform"
            >
              Randomize
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Page shell ───────────────────────────────────────────────────────────────

export function SetterReadsPage() {
  const [pool, setPool] = useState(null);

  if (pool) {
    return <LiveView pool={pool} onEnd={() => setPool(null)} />;
  }

  return (
    <div>
      <PageHeader title="Setter Reads" backTo="/tools" />
      <SetupView onStart={setPool} />
    </div>
  );
}
