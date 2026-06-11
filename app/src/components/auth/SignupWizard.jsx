import { useRef, useState } from 'react';
import { supabase } from '../../utils/supabase';
import { TRIAL_MATCH_LIMIT } from '../../constants';

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
];

const PIN_LENGTH = 6;
const TOTAL_STEPS = 4;

function ProgressDots({ step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i + 1 === step
              ? 'w-6 h-2 bg-primary'
              : i + 1 < step
              ? 'w-2 h-2 bg-primary/50'
              : 'w-2 h-2 bg-slate-700'
          }`}
        />
      ))}
    </div>
  );
}

function PinBoxes({ pin, invalid, onChange, label }) {
  return (
    <div className="w-full">
      <p className="text-base text-slate-400 text-center mb-6">{label}</p>
      <div className={`relative w-full ${invalid ? 'motion-safe:animate-shake' : ''}`}>
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
          autoFocus
          type="password"
          inputMode="numeric"
          pattern="\d*"
          maxLength={PIN_LENGTH}
          value={pin}
          onChange={e => {
            const v = e.target.value;
            if (/^\d*$/.test(v) && v.length <= PIN_LENGTH) onChange(v);
          }}
          aria-label={label}
          className="absolute inset-0 w-full h-full opacity-0 cursor-default"
        />
      </div>
    </div>
  );
}

// ── Step 1: Email ─────────────────────────────────────────────────────────────
function StepEmail({ value, onChange, onNext, error }) {
  return (
    <div className="w-full flex flex-col gap-6 animate-slide-up-fade">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-white">Create your account</h2>
        <p className="text-slate-400 text-sm">Enter your email to get started</p>
      </div>
      <input
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus
        placeholder="you@example.com"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onNext()}
        className="w-full rounded-2xl border-2 border-slate-600 bg-slate-800/40 px-5 py-4 text-lg text-white placeholder-slate-500 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all"
      />
      {error && <p className="text-sm text-red-400 text-center -mt-2">{error}</p>}
      <button
        onClick={onNext}
        className="w-full rounded-2xl bg-primary py-4 text-base font-black text-white tracking-wide active:scale-[0.97] transition-transform"
      >
        Continue
      </button>
    </div>
  );
}

// ── Step 2: Password ──────────────────────────────────────────────────────────
function StepPassword({ value, onChange, onNext, error }) {
  const [confirm,  setConfirm]  = useState('');
  const [mismatch, setMismatch] = useState(false);
  const [tooShort, setTooShort] = useState(false);
  const confirmRef = useRef(null);

  const inp = 'w-full rounded-2xl border-2 border-slate-600 bg-slate-800/40 px-5 py-4 text-lg text-white placeholder-slate-500 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all';

  function handleNext() {
    setMismatch(false);
    setTooShort(false);
    if (value.length < 8) { setTooShort(true); return; }
    if (value !== confirm) { setMismatch(true); return; }
    onNext();
  }

  return (
    <div className="w-full flex flex-col gap-5 animate-slide-up-fade">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-white">Create a password</h2>
        <p className="text-slate-400 text-sm">At least 8 characters</p>
      </div>
      <input
        type="password"
        autoComplete="new-password"
        autoFocus
        placeholder="Password"
        value={value}
        onChange={e => { onChange(e.target.value); setTooShort(false); setMismatch(false); }}
        onKeyDown={e => e.key === 'Enter' && confirmRef.current?.focus()}
        className={inp}
      />
      <input
        ref={confirmRef}
        type="password"
        autoComplete="new-password"
        placeholder="Confirm password"
        value={confirm}
        onChange={e => { setConfirm(e.target.value); setMismatch(false); }}
        onKeyDown={e => e.key === 'Enter' && handleNext()}
        className={`${inp} ${mismatch ? 'border-red-500' : ''}`}
      />
      {tooShort && <p className="text-sm text-red-400 text-center -mt-2">Password must be at least 8 characters</p>}
      {mismatch && <p className="text-sm text-red-400 text-center -mt-2">Passwords don't match</p>}
      {error    && <p className="text-sm text-red-400 text-center">{error}</p>}
      <button
        onClick={handleNext}
        className="w-full rounded-2xl bg-primary py-4 text-base font-black text-white tracking-wide active:scale-[0.97] transition-transform"
      >
        Continue
      </button>
    </div>
  );
}

// ── Step 3: School ────────────────────────────────────────────────────────────
const SCHOOL_TYPES = [
  { value: 'high_school', label: 'High School' },
  { value: 'college',     label: 'College'      },
  { value: 'club',        label: 'Club'          },
];

function StepSchool({ data, onChange, onNext, error }) {
  const inp = 'w-full rounded-2xl border-2 border-slate-600 bg-slate-800/40 px-5 py-4 text-base text-white placeholder-slate-500 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all';

  return (
    <div className="w-full flex flex-col gap-5 animate-slide-up-fade">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-white">Your school</h2>
        <p className="text-slate-400 text-sm">Tell us about your program</p>
      </div>

      <input
        type="text"
        autoFocus
        placeholder="School / Program name"
        value={data.school_name}
        onChange={e => onChange('school_name', e.target.value)}
        className={inp}
      />

      <div className="flex gap-2">
        {SCHOOL_TYPES.map(t => (
          <button
            key={t.value}
            onClick={() => onChange('school_type', t.value)}
            className={`flex-1 rounded-2xl border-2 py-3 text-sm font-bold transition-all ${
              data.school_type === t.value
                ? 'border-primary bg-primary/10 text-white'
                : 'border-slate-600 bg-slate-800/40 text-slate-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <select
        value={data.school_state}
        onChange={e => onChange('school_state', e.target.value)}
        className={`${inp} appearance-none`}
      >
        <option value="">State (optional)</option>
        {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
      </select>

      {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      <button
        onClick={onNext}
        className="w-full rounded-2xl bg-primary py-4 text-base font-black text-white tracking-wide active:scale-[0.97] transition-transform mt-2"
      >
        Continue
      </button>
    </div>
  );
}

// ── Step 4: Coach (final step — triggers account creation) ───────────────────
function StepCoach({ value, onChange, onSubmit, submitting, error }) {
  const inp = 'w-full rounded-2xl border-2 border-slate-600 bg-slate-800/40 px-5 py-4 text-lg text-white placeholder-slate-500 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all';

  return (
    <div className="w-full flex flex-col gap-6 animate-slide-up-fade">
      <div className="text-center space-y-1">
        <h2 className="text-2xl font-black text-white">Coach profile</h2>
        <p className="text-slate-400 text-sm">Your name as it will appear in records</p>
      </div>
      <input
        type="text"
        autoFocus
        placeholder="Head coach name"
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSubmit()}
        className={inp}
      />

      {/* Trial callout */}
      <div className="rounded-2xl border border-primary/30 bg-primary/10 px-4 py-3 text-center space-y-0.5">
        <p className="text-sm font-black text-primary">Full access — {TRIAL_MATCH_LIMIT} matches free</p>
        <p className="text-xs text-slate-400">Try everything. Upgrade anytime.</p>
      </div>

      {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="w-full rounded-2xl bg-primary py-4 text-base font-black text-white tracking-wide active:scale-[0.97] transition-transform disabled:opacity-50"
      >
        {submitting ? 'Creating account…' : 'Start Free Trial'}
      </button>
      <button
        onClick={onSubmit}
        disabled={submitting}
        className="text-sm text-slate-500 hover:text-slate-300 transition-colors text-center -mt-3 disabled:opacity-50"
      >
        Skip & start trial
      </button>
    </div>
  );
}

// ── Wizard shell ──────────────────────────────────────────────────────────────

export function SignupWizard({ onComplete, onBack }) {
  const [step,       setStep]       = useState(1);
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [school,     setSchool]     = useState({ school_name: '', school_type: 'high_school', school_state: '' });
  const [coachName,  setCoachName]  = useState('');
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  function clearError() { setError(''); }
  function next()       { clearError(); setStep(s => s + 1); }
  function back()       { clearError(); step > 1 ? setStep(s => s - 1) : onBack(); }

  function handleEmailNext() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }
    next();
  }

  function handleSchoolNext() {
    if (!school.school_name.trim()) { setError('Please enter your school or program name.'); return; }
    next();
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            coach_name:   coachName.trim() || null,
            school_name:  school.school_name.trim() || null,
            school_type:  school.school_type || null,
            school_state: school.school_state || null,
          },
        },
      });
      if (error) throw error;
      if (data.session) {
        // Stamp the profile with trial plan (DB trigger may have already created the row)
        await supabase
          .from('profiles')
          .upsert({ id: data.session.user.id, plan: 'trial' }, { onConflict: 'id' });
        onComplete();
      } else {
        setStep(5); // email confirmation required — show check-your-email screen
      }
    } catch (err) {
      setError(err.message ?? 'Sign up failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (step === 5) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-8 animate-fade-in"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="w-full max-w-sm text-center space-y-6">
          <div className="text-6xl">📬</div>
          <h2 className="text-2xl font-black text-white">Check your email</h2>
          <p className="text-slate-400 text-sm leading-relaxed">
            We sent a confirmation link to{' '}
            <span className="text-white font-semibold">{email}</span>.
            Click it to activate your account, then come back to log in.
          </p>
          <button
            onClick={onBack}
            className="w-full rounded-2xl bg-primary py-4 text-base font-black text-white tracking-wide active:scale-[0.97] transition-transform"
          >
            Back to Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-8 animate-fade-in"
      style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="w-full max-w-sm flex flex-col">
        <ProgressDots step={step} />

        {step === 1 && (
          <StepEmail
            value={email}
            onChange={v => { setEmail(v); clearError(); }}
            onNext={handleEmailNext}
            error={error}
          />
        )}
        {step === 2 && (
          <StepPassword
            value={password}
            onChange={setPassword}
            onNext={next}
            error={error}
          />
        )}
        {step === 3 && (
          <StepSchool
            data={school}
            onChange={(k, v) => setSchool(s => ({ ...s, [k]: v }))}
            onNext={handleSchoolNext}
            error={error}
          />
        )}
        {step === 4 && (
          <StepCoach
            value={coachName}
            onChange={setCoachName}
            onSubmit={handleSubmit}
            submitting={submitting}
            error={error}
          />
        )}

        <button
          onClick={back}
          className="mt-8 text-sm text-slate-500 hover:text-slate-300 transition-colors text-center"
        >
          ← {step === 1 ? 'Back to home' : 'Back'}
        </button>
      </div>
    </div>
  );
}
