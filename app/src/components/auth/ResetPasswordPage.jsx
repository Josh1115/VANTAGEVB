import { useState } from 'react';
import { supabase } from '../../utils/supabase';

// Supabase's raw error text can include internal/server details that mean
// nothing to a coach and shouldn't be shown as-is. Map known cases to a
// plain-language message and fall back to a generic one otherwise.
function friendlyResetError(error) {
  const message = error?.message?.toLowerCase() ?? '';
  if (message.includes('expired') || message.includes('invalid') || message.includes('token')) {
    return 'Your reset link has expired. Please request a new one.';
  }
  if (message.includes('network') || message.includes('fetch')) {
    return 'Network error. Check your connection and try again.';
  }
  return 'Something went wrong updating your password. Please try again.';
}

export function ResetPasswordPage({ onDone }) {
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [done,     setDone]     = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm)  { setError('Passwords do not match.'); return; }
    setError('');
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { setError(friendlyResetError(error)); return; }
    setDone(true);
    setTimeout(onDone, 1800);
  }

  const inp = 'w-full rounded-2xl border-2 border-slate-600 bg-slate-800/40 px-5 py-4 text-lg text-white placeholder-slate-500 outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50';

  if (done) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="text-center space-y-2">
          <div className="text-4xl">✓</div>
          <p className="text-white text-lg font-black">Password updated</p>
          <p className="text-slate-400 text-sm">Taking you back…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="space-y-1">
          <h1 className="text-white text-2xl font-black">Set new password</h1>
          <p className="text-slate-400 text-sm">Choose a strong password for your account.</p>
        </div>
        <input
          type="password"
          placeholder="New password (8+ characters)"
          value={password}
          onChange={e => setPassword(e.target.value)}
          autoComplete="new-password"
          autoFocus
          className={inp}
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          autoComplete="new-password"
          className={inp}
        />
        {error && <p className="text-red-400 text-sm px-1">{error}</p>}
        <button
          type="submit"
          disabled={loading || !password || !confirm}
          className="w-full bg-primary hover:bg-primary/90 text-white rounded-2xl py-4 text-lg font-black disabled:opacity-40 transition-colors"
        >
          {loading ? 'Saving…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
