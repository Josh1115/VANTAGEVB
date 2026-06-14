import { useState } from 'react';
import { TermsContent, TERMS_VERSION } from './TermsContent';

export const TERMS_STORAGE_KEY = 'vbstat_terms_accepted';

function getStoredVersion() {
  try {
    const raw = localStorage.getItem(TERMS_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw).version ?? null;
    } catch {
      return raw === TERMS_VERSION ? TERMS_VERSION : null;
    }
  } catch { return null; }
}

function isAccepted() {
  return getStoredVersion() === TERMS_VERSION;
}

export function TermsGate({ children }) {
  const [accepted, setAccepted] = useState(isAccepted);
  const isUpdate = getStoredVersion() !== null && !accepted;

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
        <h1 className="font-bold text-lg tracking-wide text-white">
          {isUpdate ? 'Updated Terms & Conditions' : 'Terms & Conditions'}
        </h1>
        <p className="text-xs text-slate-400 mt-0.5">
          {isUpdate
            ? 'Our terms have been updated — please review and accept to continue'
            : 'Review and accept to continue'}
        </p>
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
