import { useEffect, useState } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useMatchStore } from '../../store/matchStore';

export function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();
  const matchId = useMatchStore(s => s.matchId);
  const [pendingUpdate, setPendingUpdate] = useState(false);

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
