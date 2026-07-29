import { useEffect, useRef, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useMatchStore } from '../../store/matchStore';

// How often to actively re-check for a new version while the app is open.
// The browser only checks for a changed service-worker script on a genuine
// page load — a backgrounded/resumed PWA (the common mobile case: switching
// back to it rather than force-closing and relaunching) never gets one, so
// without this an update can sit undetected until the app is fully killed
// and reopened. Checking on foreground-resume covers that case immediately;
// this interval is just a backstop for a session left open uninterrupted.
const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

export function UpdatePrompt() {
  const registrationRef = useRef(null);
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      registrationRef.current = registration;
    },
  });
  const matchId = useMatchStore(s => s.matchId);
  const [pendingUpdate, setPendingUpdate] = useState(false);

  // Actively check for a new version — on foreground resume (covers a PWA
  // reopened from the background, not just a fresh load) and periodically
  // as a backstop for a long-running session. registration.update() is a
  // cheap conditional-GET of the SW script; if it's unchanged this is a
  // no-op, and if it changed the existing needRefresh flow below handles it.
  useEffect(() => {
    const checkForUpdate = () => registrationRef.current?.update();

    const onVisible = () => { if (document.visibilityState === 'visible') checkForUpdate(); };
    document.addEventListener('visibilitychange', onVisible);
    const interval = setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);

    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(interval);
    };
  }, []);

  // When an update arrives, apply immediately if no match is live — otherwise defer.
  useEffect(() => {
    if (!needRefresh) return;
    if (!matchId) {
      updateServiceWorker(true);
    } else {
      setPendingUpdate(true);
    }
  }, [needRefresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // When the match ends and an update is waiting, apply it automatically.
  useEffect(() => {
    if (pendingUpdate && !matchId) {
      updateServiceWorker(true);
    }
  }, [matchId, pendingUpdate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Only show the banner while a match is actively in progress with a pending update.
  if (!pendingUpdate || !matchId) return null;

  return (
    <div className="fixed bottom-24 left-0 right-0 z-50 px-4 pointer-events-none">
      <div className="bg-slate-800 border border-slate-600/80 rounded-xl px-4 py-2.5 flex items-center justify-between gap-3 shadow-xl pointer-events-auto">
        <p className="text-xs text-slate-300 leading-snug">
          App update ready — will apply automatically after your match.
        </p>
        <button
          onClick={() => updateServiceWorker(true)}
          className="text-xs font-bold text-primary shrink-0 hover:text-orange-300 transition-colors whitespace-nowrap"
        >
          Apply now
        </button>
      </div>
    </div>
  );
}
