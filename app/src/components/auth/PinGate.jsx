import { useEffect, useRef, useState } from 'react';
import { VantageLogo } from '../ui/VantageLogo';
import { SignupWizard } from './SignupWizard';

const SESSION_KEY  = 'vbstat_authed';
const PIN_LENGTH   = 6;
const MASTER_PIN   = '111590';
const SIGNUP_OPEN  = false; // flip to true when sign-ups are ready to launch

export function PinGate({ children }) {
  const [authed,  setAuthed]  = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  });
  const [pin,     setPin]     = useState('');
  const [invalid, setInvalid] = useState(false);
  const [phase,   setPhase]   = useState(0);
  const [choice,  setChoice]  = useState(null); // null | 'login' | 'signup'
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

  function handlePinChange(e) {
    const val = e.target.value;
    if (!/^\d*$/.test(val) || val.length > PIN_LENGTH) return;
    setPin(val);
    setInvalid(false);

    if (val.length === PIN_LENGTH) {
      if (val === MASTER_PIN) {
        try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
        setAuthed(true);
      } else {
        setInvalid(true);
        setTimeout(() => { setPin(''); setInvalid(false); }, 1000);
      }
    }
  }

  function handleComplete() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
    setAuthed(true);
  }

  function handleBack() {
    setChoice(null);
    setPin('');
    setInvalid(false);
  }

  const focusInput = () => inputRef.current?.focus();

  // Sign-up path — full-screen wizard
  if (choice === 'signup') {
    return <SignupWizard onComplete={handleComplete} onBack={handleBack} />;
  }

  const showForm = choice === 'login';

  return (
    <div
      className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-8 animate-fade-in"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}
    >
      <div className="flex flex-col items-center gap-12 w-full max-w-sm">

        {/* Brandmark */}
        <div className="flex flex-col items-center gap-5">
          <div
            style={{
              opacity: phase >= 1 ? 1 : 0,
              transition: 'opacity 1.3s ease',
              transform: 'scale(2)',
              transformOrigin: 'top center',
              marginBottom: '5.5rem',
            }}
          >
            <VantageLogo animated={phase >= 2} />
          </div>
          <p className="text-2xl font-semibold tracking-[0.25em] text-slate-400 flex gap-3">
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
            className="text-[21px] italic text-slate-500"
            style={{ opacity: phase >= 5 ? 1 : 0, transition: 'opacity 0.8s ease' }}
          >
            Powered by the S.S.E (Shua Stat Engine)
          </p>
        </div>

        {/* Sign Up / Log In choice */}
        {!showForm && (
          <div
            className="w-full flex flex-col gap-4"
            style={{ opacity: phase >= 5 ? 1 : 0, transition: 'opacity 0.8s ease' }}
          >
            <button
              onClick={() => setChoice('login')}
              className="w-full rounded-2xl bg-primary py-5 text-lg font-black text-white tracking-wide active:scale-[0.97] transition-transform"
            >
              Log In
            </button>
            <div className="relative w-full overflow-hidden rounded-2xl">
              <button
                onClick={SIGNUP_OPEN ? () => setChoice('signup') : undefined}
                disabled={!SIGNUP_OPEN}
                className="w-full rounded-2xl border-2 border-slate-600 bg-slate-800/40 py-5 text-lg font-black tracking-wide transition-transform text-slate-600 cursor-not-allowed select-none"
              >
                Sign Up
              </button>
              {!SIGNUP_OPEN && (
                <div
                  className="absolute inset-0 rounded-2xl flex items-center justify-center pointer-events-none overflow-hidden"
                  style={{
                    background: 'repeating-linear-gradient(-45deg, #f59e0b 0px, #f59e0b 12px, #1a1306 12px, #1a1306 24px)',
                  }}
                >
                  <span
                    className="text-sm font-black tracking-[0.2em] uppercase px-4 py-1 rounded"
                    style={{ color: '#000', background: '#f59e0b', letterSpacing: '0.2em' }}
                  >
                    ⚠ COMING SOON
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Login form */}
        {showForm && (
          <div className="w-full flex flex-col gap-10 animate-slide-up-fade">

            {/* PIN boxes */}
            <div>
              <p className="text-base text-slate-400 text-center mb-6">Enter your PIN</p>
              <div
                className={`relative w-full ${invalid ? 'motion-safe:animate-shake' : ''}`}
                onClick={focusInput}
              >
                <div className="flex justify-center gap-2">
                  {Array.from({ length: PIN_LENGTH }).map((_, i) => {
                    const filled = i < pin.length;
                    const active = !invalid && i === pin.length;
                    const base   = 'flex items-center justify-center w-12 h-16 rounded-2xl border-2 text-3xl text-white transition-all duration-150';
                    const state  = invalid
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
                            ? <span className="w-1 h-8 rounded-full bg-primary motion-safe:animate-pulse" />
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
                  onChange={handlePinChange}
                  autoFocus
                  aria-label="Access PIN"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-default"
                />
              </div>
            </div>

            {/* Error */}
            <p className={`h-6 text-base font-semibold text-red-400 text-center transition-opacity ${invalid ? 'opacity-100' : 'opacity-0'}`}>
              Incorrect PIN
            </p>

            {/* Back */}
            <button
              onClick={handleBack}
              className="text-sm text-slate-500 hover:text-slate-300 transition-colors -mt-6"
            >
              ← Back
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
