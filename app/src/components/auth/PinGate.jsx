import { useEffect, useRef, useState } from 'react';
import { VantageLogo } from '../ui/VantageLogo';

const SESSION_KEY = 'vbstat_authed';
const PIN_LENGTH  = 6;

export function PinGate({ children }) {
  const [authed, setAuthed] = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  });
  const [username, setUsername] = useState('');
  const [pin,     setPin]     = useState('');
  const [invalid, setInvalid] = useState(false);
  const [phase,   setPhase]   = useState(0); // 0=blank 1=logo fading in 2=animated+pin visible
  const inputRef = useRef(null);

  useEffect(() => {
    if (authed) return;
    const t1 = setTimeout(() => setPhase(p => Math.max(p, 1)), 80);
    const t2 = setTimeout(() => setPhase(p => Math.max(p, 2)), 80 + 1350);
    const t3 = setTimeout(() => setPhase(p => Math.max(p, 3)), 80 + 1350 + 400);
    const t4 = setTimeout(() => setPhase(p => Math.max(p, 4)), 80 + 1350 + 800);
    const t5 = setTimeout(() => setPhase(p => Math.max(p, 5)), 80 + 1350 + 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, [authed]);

  if (authed) return children;

  function handleChange(e) {
    const val = e.target.value;
    if (!/^\d*$/.test(val) || val.length > PIN_LENGTH) return;
    setPin(val);
    setInvalid(false);
    if (val.length === PIN_LENGTH) {
      if (val === '111590') {
        try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
        setAuthed(true);
      } else {
        setInvalid(true);
        setTimeout(() => { setPin(''); setInvalid(false); }, 1000);
      }
    }
  }

  const focusInput = () => inputRef.current?.focus();

  return (
    <div
      className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-6 animate-fade-in"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex flex-col items-center gap-8 w-full max-w-xs">
        {/* Brandmark */}
        <div className="flex flex-col items-center gap-3">
          <div style={{ opacity: phase >= 1 ? 1 : 0, transition: 'opacity 1.3s ease' }}>
            <VantageLogo animated={phase >= 2} />
          </div>
          {/* Slogan — one word at a time */}
          <p className="text-xs font-semibold tracking-[0.25em] text-slate-400 flex gap-2">
            {['PRECISION', 'SIDELINE', 'ANALYTICS'].map((word, i) => (
              <span
                key={word}
                style={{ opacity: phase >= i + 2 ? 1 : 0, transition: 'opacity 0.6s ease' }}
              >
                {word}
              </span>
            ))}
          </p>
          <p
            className="text-xs italic text-slate-500"
            style={{ opacity: phase >= 5 ? 1 : 0, transition: 'opacity 0.8s ease' }}
          >
            Powered by the S.S.E (Shua Stat Engine)
          </p>
        </div>

        {/* Username */}
        <div
          className="w-full"
          style={{ opacity: phase >= 5 ? 1 : 0, transition: 'opacity 0.8s ease' }}
        >
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={e => setUsername(e.target.value)}
            autoComplete="username"
            aria-label="Username"
            className="w-full rounded-xl border-2 border-slate-600 bg-slate-800/40 px-4 py-3 text-white placeholder-slate-500 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all duration-150"
          />
          <p
            className="mt-8 text-sm text-slate-400 text-center"
          >
            Enter your access PIN
          </p>
        </div>

        {/* Digit boxes (whole row focuses one hidden numeric input) */}
        <div
          className={`relative w-full ${invalid ? 'motion-safe:animate-shake' : ''}`}
          style={{ opacity: phase >= 5 ? 1 : 0, transition: 'opacity 0.8s ease' }}
          onClick={focusInput}
        >
          <div className="flex justify-center gap-2.5">
            {Array.from({ length: PIN_LENGTH }).map((_, i) => {
              const filled  = i < pin.length;
              const active  = !invalid && i === pin.length;
              const base    = 'flex items-center justify-center w-11 h-14 rounded-xl border-2 text-2xl text-white transition-all duration-150';
              const state   = invalid
                ? 'border-red-500 bg-red-500/5 text-red-400'
                : filled
                  ? 'border-primary bg-primary/10 motion-safe:scale-105'
                  : active
                    ? 'border-primary ring-2 ring-primary/30'
                    : 'border-slate-600 bg-slate-800/40';
              return (
                <div key={i} className={`${base} ${state}`}>
                  {filled
                    ? <span className="leading-none">●</span>
                    : active
                      ? <span className="w-0.5 h-6 rounded-full bg-primary motion-safe:animate-pulse" />
                      : null}
                </div>
              );
            })}
          </div>

          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            pattern="\d*"
            maxLength={PIN_LENGTH}
            value={pin}
            onChange={handleChange}
            autoFocus
            aria-label="Access PIN"
            className="absolute inset-0 w-full h-full opacity-0 cursor-default"
          />
        </div>

        {/* Error line — reserves space to avoid layout shift */}
        <p
          className={`h-5 text-sm font-semibold text-red-400 transition-opacity ${invalid ? 'opacity-100' : 'opacity-0'}`}
          style={{ opacity: phase >= 5 ? undefined : 0 }}
        >
          Incorrect PIN
        </p>
      </div>
    </div>
  );
}
