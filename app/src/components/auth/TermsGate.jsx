import { useState } from 'react';
import { TermsContent, TERMS_VERSION } from './TermsContent';

export const TERMS_STORAGE_KEY = 'vbstat_terms_accepted';

function isAccepted() {
  try {
    const raw = localStorage.getItem(TERMS_STORAGE_KEY);
    if (!raw) return false;
    try {
      const parsed = JSON.parse(raw);
      return parsed.version === TERMS_VERSION;
    } catch {
      // Old plain-string format — migrate to structured entry (acceptedAt unknown)
      if (raw === TERMS_VERSION) {
        try { localStorage.setItem(TERMS_STORAGE_KEY, JSON.stringify({ version: TERMS_VERSION, acceptedAt: null })); } catch {}
        return true;
      }
      return false;
    }
  } catch { return false; }
}

export function TermsGate({ children }) {
  const [accepted, setAccepted] = useState(isAccepted);

  if (accepted) return children;

  function handleAccept() {
    try { localStorage.setItem(TERMS_STORAGE_KEY, JSON.stringify({ version: TERMS_VERSION, acceptedAt: new Date().toISOString() })); } catch {}
    setAccepted(true);
  }

  return (
    <div
      className="fixed inset-0 bg-slate-950 flex flex-col z-50"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="bg-slate-900 border-b border-slate-700 px-4 py-3 shrink-0">
        <h1 className="font-bold text-lg tracking-wide text-white">Terms &amp; Conditions</h1>
        <p className="text-xs text-slate-400 mt-0.5">Review and accept to continue</p>
      </div>

      <div className="flex-1 overflow-y-auto">
        <TermsContent />
      </div>

      <div className="shrink-0 px-4 py-4 bg-slate-900 border-t border-slate-700">
        <button
          onClick={handleAccept}
          className="w-full bg-primary hover:opacity-90 active:opacity-75 text-white font-bold py-3 rounded-xl text-base tracking-wide transition-opacity"
        >
          I Accept
        </button>
      </div>
    </div>
  );
}
