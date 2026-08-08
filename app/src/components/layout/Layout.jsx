import { Component, useEffect, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { NavBar } from './NavBar';
import { UpdatePrompt } from './UpdatePrompt';
import { useUiStore, selectToast, selectUpgradeNudge, selectCloseUpgradeNudge } from '../../store/uiStore';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Confetti } from '../ui/Confetti';
import { autoSaveBackup } from '../../stats/backup';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { usePlan } from '../../hooks/usePlan';
import { useAuth } from '../../contexts/AuthContext';

const IOS_BANNER_KEY     = 'vbstat_ios_install_dismissed';
const ANDROID_BANNER_KEY = 'vbstat_android_install_dismissed';

function IosInstallBanner() {
  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.navigator.standalone === true;
  const [visible, setVisible] = useState(
    () => isIos && !isStandalone && !localStorage.getItem(IOS_BANNER_KEY)
  );

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(IOS_BANNER_KEY, '1');
    setVisible(false);
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-3 pb-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="bg-slate-800 border border-slate-600 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
        <div className="text-2xl shrink-0">📲</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">Install VANTAGE</p>
          <p className="text-xs text-slate-400 leading-snug mt-0.5">
            Tap <span className="inline-block text-primary font-bold">⬆ Share</span> then <span className="font-semibold text-slate-300">"Add to Home Screen"</span> for the full app experience.
          </p>
        </div>
        <button
          onClick={dismiss}
          className="shrink-0 text-slate-500 hover:text-white text-xl leading-none px-1"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function AndroidInstallBanner() {
  const { canInstall, isInstalled, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(
    () => !!localStorage.getItem(ANDROID_BANNER_KEY)
  );

  if (!canInstall || isInstalled || dismissed) return null;

  function dismiss() {
    localStorage.setItem(ANDROID_BANNER_KEY, '1');
    setDismissed(true);
  }

  return (
    <div className="fixed bottom-20 left-0 right-0 z-50 px-3 pb-1" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="bg-slate-800 border border-slate-600 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-xl">
        <div className="text-2xl shrink-0">📲</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white leading-snug">Install VANTAGE</p>
          <p className="text-xs text-slate-400 leading-snug mt-0.5">
            Add to your home screen for full-screen mode and faster load times.
          </p>
        </div>
        <button
          onClick={promptInstall}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold text-white"
          style={{ background: '#e8530b' }}
        >
          Install
        </button>
        <button
          onClick={dismiss}
          className="shrink-0 text-slate-500 hover:text-white text-xl leading-none px-1"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      const err = this.state.error;
      const msg = err?.message ?? '';
      // Module-load failures (PWA stale asset) are always TypeErrors.
      // iOS Safari reports them as short "Load failed" TypeErrors with no stack detail.
      const isTypeError = err instanceof TypeError;
      const isUpdateError =
        /MODULE_SCRIPT_FAILED|dynamically imported module|Failed to fetch|Load failed|Loading chunk|Unable to preload/i.test(msg) ||
        (isTypeError && /load|fetch|import|module|chunk/i.test(msg)) ||
        (isTypeError && msg.length < 40);
      if (isUpdateError) {
        return (
          <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 p-8 text-center">
            <p className="text-5xl">🔄</p>
            <p className="text-white font-bold text-lg">App Update Available</p>
            <p className="text-slate-400 text-sm">COMPLETELY CLOSE THE APP FOR NEW UPDATE!</p>
            <button
              className="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold"
              onClick={() => window.location.reload()}
            >
              Reload Now
            </button>
          </div>
        );
      }
      return (
        <div className="min-h-screen bg-bg flex flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-4xl">⚠️</p>
          <p className="text-white font-bold text-lg">Something went wrong</p>
          <p className="text-slate-400 text-sm">{msg}</p>
          <button
            className="mt-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold"
            onClick={() => { this.setState({ error: null }); window.location.reload(); }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Hide NavBar on live match screen (full-screen immersive)
const HIDE_NAV = ['/live', '/set-lineup', '/tools/setter-reads'];

function ExpiryBanner() {
  const { daysUntilExpiry } = usePlan();
  const navigate = useNavigate();
  if (daysUntilExpiry == null || daysUntilExpiry > 14) return null;
  const msg = daysUntilExpiry <= 1 ? 'Your plan expires today' : `Your plan expires in ${daysUntilExpiry} days`;
  return (
    <div className="bg-amber-900/60 border-b border-amber-700 px-4 py-2 flex items-center justify-between gap-2 text-xs">
      <span className="text-amber-300 font-semibold">{msg}</span>
      <button onClick={() => navigate('/upgrade')} className="text-amber-200 font-black underline shrink-0">
        Renew
      </button>
    </div>
  );
}

// Popup shown when a trial user hits their 4th or 5th (last) match slot.
function UpgradeNudgeModal() {
  const nudge = useUiStore(selectUpgradeNudge);
  const close = useUiStore(selectCloseUpgradeNudge);
  const navigate = useNavigate();
  if (!nudge) return null;
  const atLimit = nudge.used >= nudge.limit;
  return (
    <Modal
      title={atLimit ? 'Trial complete' : 'One match left'}
      onClose={close}
      footer={
        <>
          <Button variant="secondary" onClick={close}>Not now</Button>
          <Button variant="primary" onClick={() => { close(); navigate('/upgrade'); }}>Upgrade now</Button>
        </>
      }
    >
      <p className="text-sm text-slate-300">
        {atLimit
          ? `You've used all ${nudge.limit} of your trial matches. Upgrade to a full season plan to keep recording matches.`
          : `You've used ${nudge.used} of your ${nudge.limit} trial matches — just one left. Upgrade now to keep going without interruption.`}
      </p>
    </Modal>
  );
}

// One-time popup shown on August 10, 2026 (day one of tryouts) for every user, then never again.
const TRYOUTS_POPUP_KEY = 'vbstat_tryouts_2026_seen';

function TryoutsGoodLuckModal() {
  const [visible, setVisible] = useState(() => {
    const now = new Date();
    const isTryoutsDay = now.getFullYear() === 2026 && now.getMonth() === 7 && now.getDate() === 10; // month 7 = August
    return isTryoutsDay && !localStorage.getItem(TRYOUTS_POPUP_KEY);
  });

  if (!visible) return null;

  function dismiss() {
    localStorage.setItem(TRYOUTS_POPUP_KEY, '1');
    setVisible(false);
  }

  return (
    <>
      <Confetti />
      <Modal
        title="🏐 Good luck!"
        onClose={dismiss}
        footer={<Button variant="primary" onClick={dismiss}>Thanks!</Button>}
      >
        <p className="text-sm text-slate-300 text-center">
          Best of luck on day one of your 2026 tryouts!
        </p>
      </Modal>
    </>
  );
}

export function Layout() {
  const { pathname } = useLocation();
  const { session } = useAuth();
  const { teamsAllowed, matchLimit, isMaster } = usePlan();
  const toast = useUiStore(selectToast);
  const hideNav = HIDE_NAV.some((p) => pathname.includes(p));

  useEffect(() => {
    if (sessionStorage.getItem('vbstat_auto_backup_done')) return;
    sessionStorage.setItem('vbstat_auto_backup_done', '1');
    autoSaveBackup('app_open', { session, teamsAllowed, matchLimit, isMaster }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-bg text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <UpdatePrompt />
      {!hideNav && <ExpiryBanner />}
      <main className={hideNav ? '' : 'pb-20'}>
        <div className={hideNav ? '' : 'max-w-2xl md:max-w-3xl lg:max-w-5xl xl:max-w-6xl mx-auto'}>
          <ErrorBoundary key={pathname}>
            <div className="animate-page-enter">
              <Outlet />
            </div>
          </ErrorBoundary>
        </div>
      </main>

      {!hideNav && <NavBar />}
      <IosInstallBanner />
      <AndroidInstallBanner />
      <TryoutsGoodLuckModal />

      {/* Toast */}
      {toast && (
        <div
          className={`fixed left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 rounded-lg text-sm font-medium shadow-lg
            ${toast.variant === 'error' ? 'bg-red-600' : toast.variant === 'success' ? 'bg-green-600' : 'bg-slate-700'}`}
          style={{ top: 'max(1rem, env(safe-area-inset-top))' }}
        >
          {toast.message}
        </div>
      )}

      <UpgradeNudgeModal />
    </div>
  );
}
