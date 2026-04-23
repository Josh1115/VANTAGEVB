import { useRegisterSW } from 'virtual:pwa-register/react';

export function UpdatePrompt() {
  const { needRefresh: [needRefresh], updateServiceWorker } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between gap-3 px-4 py-3 bg-primary text-white shadow-lg animate-slide-down">
      <span className="text-sm font-bold tracking-wide">NEW UPDATE AVAILABLE. CLOSE APP COMPLETELY &amp; RELOAD</span>
    </div>
  );
}
