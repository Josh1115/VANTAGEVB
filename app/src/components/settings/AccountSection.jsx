import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useUiStore } from '../../store/uiStore';
import { supabase } from '../../utils/supabase';
import { ConfirmDialog } from '../ui/ConfirmDialog';

function VantageChevron({ open }) {
  return (
    <svg
      width="20" height="16"
      viewBox="0 0 20 16"
      aria-hidden="true"
      className={`transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
    >
      <polygon points="0,0 20,0 10,16" fill="#e8530b" />
      <polygon points="3.5,0 16.5,0 10,11" fill="#fef3ee" />
    </svg>
  );
}

// Always-visible account block below the tabs: signed-in email, change
// password, sign out, delete account. Not tied to any one settings tab.
export function AccountSection() {
  const showToast = useUiStore((s) => s.showToast);
  const { session } = useAuth();

  const [showChangePw,    setShowChangePw]    = useState(false);
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw,      setChangingPw]      = useState(false);
  const [confirmLogout,        setConfirmLogout]        = useState(false);
  const [confirmDeleteAccount, setConfirmDeleteAccount] = useState(false);

  async function handleChangePassword() {
    if (newPassword.length < 8) { showToast('Password must be at least 8 characters.', 'error'); return; }
    if (newPassword !== confirmPassword) { showToast('Passwords do not match.', 'error'); return; }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePw(false);
      showToast('Password updated successfully.', 'success');
    } catch (e) {
      showToast(e.message ?? 'Password update failed.', 'error');
    } finally {
      setChangingPw(false);
    }
  }

  return (
    <section className="bg-surface rounded-xl p-4 space-y-3">
      {session && (
        <div className="flex items-center gap-3 pb-3 border-b border-slate-700/60">
          <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-slate-200 shrink-0">
            {session.user.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">{session.user.email}</p>
            <p className="text-xs text-slate-500">Signed in</p>
          </div>
        </div>
      )}

      {/* Change Password */}
      <button
        onClick={() => { setShowChangePw(v => !v); setNewPassword(''); setConfirmPassword(''); }}
        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-700/50 hover:bg-slate-700 active:scale-95 border border-slate-600/50 text-slate-200 font-semibold text-sm transition-all duration-150"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Change Password
        </span>
        <VantageChevron open={showChangePw} />
      </button>

      {showChangePw && (
        <div className="space-y-2 pt-1">
          <input
            type="password"
            placeholder="New password (min 8 characters)"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleChangePassword()}
            className="w-full rounded-xl border border-slate-600 bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
          />
          <button
            onClick={handleChangePassword}
            disabled={changingPw || !newPassword || !confirmPassword}
            className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold tracking-wide disabled:opacity-40 active:scale-[0.98] transition-transform"
          >
            {changingPw ? 'Updating…' : 'Update Password'}
          </button>
        </div>
      )}

      {/* Sign Out */}
      <button
        onClick={() => setConfirmLogout(true)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 active:scale-95 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 font-semibold text-sm transition-all duration-150"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
        Sign Out
      </button>

      {/* Delete Account */}
      <button
        onClick={() => setConfirmDeleteAccount(true)}
        className="w-full text-center text-xs text-slate-500 hover:text-red-400 transition-colors pt-1"
      >
        Delete account
      </button>

      {confirmLogout && (
        <ConfirmDialog
          title="Sign Out"
          message="Are you sure you want to sign out?"
          confirmLabel="Sign Out"
          danger
          onConfirm={async () => {
            try {
              const { error } = await supabase.auth.signOut();
              if (error) showToast('Sign out failed. Try again.', 'error');
            } catch {
              showToast('Sign out failed. Try again.', 'error');
            }
          }}
          onCancel={() => setConfirmLogout(false)}
        />
      )}

      {confirmDeleteAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <div className="text-base font-black text-white">Delete Account</div>
            <p className="text-sm text-slate-400 leading-relaxed">
              To delete your account and all associated data, email us at:
            </p>
            <a
              href={`mailto:vantagevb@gmail.com?subject=${encodeURIComponent('Account Deletion Request')}&body=${encodeURIComponent(`Please delete my Vantage account.\n\nEmail: ${session?.user?.email ?? ''}\n\nI understand this will permanently remove my account and all cloud-stored data.`)}`}
              className="block w-full py-2.5 rounded-xl bg-primary text-white text-sm font-bold text-center tracking-wide"
              onClick={() => setConfirmDeleteAccount(false)}
            >
              Send Deletion Request
            </a>
            <p className="text-xs text-slate-500 text-center leading-relaxed">
              vantagevb@gmail.com — we'll process your request within 7 days. Local device data must be cleared separately via Settings → Data Management → Clear All.
            </p>
            <button
              onClick={() => setConfirmDeleteAccount(false)}
              className="w-full py-2 rounded-xl bg-slate-700 text-white text-sm font-semibold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
