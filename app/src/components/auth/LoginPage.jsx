import { useEffect, useRef, useState } from 'react';
import { VantageLogo } from '../ui/VantageLogo';
import { supabase } from '../../utils/supabase';

export function LoginPage({ onSignup }) {
  const [phase,      setPhase]      = useState(0);
  const [showForm,   setShowForm]   = useState(false);
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const passRef = useRef(null);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(p => Math.max(p, 1)), 80);
    const t2 = setTimeout(() => setPhase(p => Math.max(p, 2)), 80 + 1350);
    const t3 = setTimeout(() => setPhase(p => Math.max(p, 3)), 80 + 1350 + 400);
    const t4 = setTimeout(() => setPhase(p => Math.max(p, 4)), 80 + 1350 + 800);
    const t5 = setTimeout(() => setPhase(p => Math.max(p, 5)), 80 + 1350 + 1400);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); clearTimeout(t5); };
  }, []);

  async function handleLogin() {
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (error) setError(error.message);
    setLoading(false);
    // On success, AuthContext onAuthStateChange fires automatically
  }

  async function handleForgot() {
    if (!email.trim()) { setError('Enter your email above first.'); return; }
    setError('');
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: window.location.origin,
    });
    setForgotSent(true);
  }

  const inp = 'w-full rounded-2xl border-2 border-slate-600 bg-slate-800/40 px-5 py-4 text-lg text-white placeholder-slate-500 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all';

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

        {/* Buttons */}
        <div
          className="w-full flex flex-col gap-4"
          style={{ opacity: phase >= 5 ? 1 : 0, transition: 'opacity 0.8s ease' }}
        >
          {!showForm ? (
            <>
              <button
                onClick={() => setShowForm(true)}
                className="w-full rounded-2xl bg-primary py-5 text-lg font-black text-white tracking-wide active:scale-[0.97] transition-transform"
              >
                Log In
              </button>
              <button
                onClick={onSignup}
                className="w-full rounded-2xl border-2 border-slate-600 bg-slate-800/40 py-5 text-lg font-black text-slate-300 tracking-wide active:scale-[0.97] transition-transform"
              >
                Sign Up
              </button>
            </>
          ) : (
            <div className="w-full flex flex-col gap-4 animate-slide-up-fade">
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                autoFocus
                placeholder="Email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); setForgotSent(false); }}
                onKeyDown={e => e.key === 'Enter' && passRef.current?.focus()}
                className={inp}
              />
              <input
                ref={passRef}
                type="password"
                autoComplete="current-password"
                placeholder="Password"
                value={password}
                onChange={e => { setPassword(e.target.value); setError(''); }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                className={inp}
              />

              {error      && <p className="text-sm text-red-400 text-center -mt-1">{error}</p>}
              {forgotSent && <p className="text-sm text-emerald-400 text-center -mt-1">Reset link sent — check your email</p>}

              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full rounded-2xl bg-primary py-5 text-lg font-black text-white tracking-wide active:scale-[0.97] transition-transform disabled:opacity-50"
              >
                {loading ? 'Signing in…' : 'Log In'}
              </button>

              <div className="flex justify-between -mt-1">
                <button
                  onClick={() => { setShowForm(false); setError(''); setForgotSent(false); setEmail(''); setPassword(''); }}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  ← Back
                </button>
                <button
                  onClick={handleForgot}
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
