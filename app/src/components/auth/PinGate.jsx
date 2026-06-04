import { useEffect, useRef, useState } from 'react';
import { VantageLogo } from '../ui/VantageLogo';
import { SignupWizard } from './SignupWizard';
import { apiLogin, apiMe } from '../../utils/api';
import { STORAGE_KEYS } from '../../utils/storage';

const SESSION_KEY = 'vbstat_authed';
const PIN_LENGTH  = 6;

function getStoredEmail() {
  try { return localStorage.getItem(STORAGE_KEYS.ACCOUNT_EMAIL) ?? ''; } catch { return ''; }
}

function getStoredToken() {
  try { return localStorage.getItem(STORAGE_KEYS.ACCOUNT_TOKEN); } catch { return null; }
}

export function PinGate({ children }) {
  const [authed,  setAuthed]  = useState(() => {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch { return false; }
  });
  const [email,   setEmail]   = useState(getStoredEmail);
  const [pin,     setPin]     = useState('');
  const [invalid, setInvalid] = useState(false);
  const [errMsg,  setErrMsg]  = useState('');
  const [phase,   setPhase]   = useState(0);
  const [choice,  setChoice]  = useState(null); // null | 'login' | 'signup'
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);

  // Silently re-validate a stored JWT on mount (skip if already session-authed)
  useEffect(() => {
    if (authed) return;
    const token = getStoredToken();
    if (!token) return;
    apiMe().then(() => {
      try { sessionStorage.setItem(SESSION_KEY, '1'); } catch {}
      setAuthed(true);
    }).catch(() => {
      try { localStorage.removeItem(STORAGE_KEYS.ACCOUNT_TOKEN); } catch {}
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  async function handlePinChange(e) {
    const val = e.target.value;
    if (!/^\d*$/.test(val) || val.length > PIN_LENGTH) return;
    setPin(val);
    setInvalid(false);
    setErrMsg('');

    if (val.length === PIN_LENGTH) {
      setLoading(true);
      try {
        const { token } = await apiLogin({ email: email.trim().toLowerCase(), pin: val });
        try {
          localStorage.setItem(STORAGE_KEYS.ACCOUNT_TOKEN, token);
          localStorage.setItem(STORAGE_KEYS.ACCOUNT_EMAIL, email.trim().toLowerCase());
          sessionStorage.setItem(SESSION_KEY, '1');
        } catch {}
        setAuthed(true);
      } catch (err) {
        setInvalid(true);
        setErrMsg(err.message ?? 'Incorrect email or PIN');
        setTimeout(() => { setPin(''); setInvalid(false); }, 1000);
      } finally {
        setLoading(false);
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
    setErrMsg('');
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
            <button
              onClick={() => setChoice('signup')}
              className="w-full rounded-2xl border-2 border-slate-600 bg-slate-800/40 py-5 text-lg font-black text-slate-300 tracking-wide active:scale-[0.97] transition-transform"
            >
              Sign Up
            </button>
          </div>
        )}

        {/* Login form */}
        {showForm && (
          <div className="w-full flex flex-col gap-10 animate-slide-up-fade">

            {/* Email */}
            <input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Email address"
              value={email}
              onChange={e => { setEmail(e.target.value); setErrMsg(''); }}
              autoFocus
              className="w-full rounded-2xl border-2 border-slate-600 bg-slate-800/40 px-5 py-4 text-lg text-white placeholder-slate-500 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all duration-150"
            />

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
                          ? <span className="leading-none">{loading ? '…' : '●'}</span>
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
                  disabled={loading}
                  aria-label="Access PIN"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-default"
                />
              </div>
            </div>

            {/* Error */}
            <p className={`h-6 text-base font-semibold text-red-400 text-center transition-opacity ${invalid || errMsg ? 'opacity-100' : 'opacity-0'}`}>
              {errMsg || 'Incorrect PIN'}
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
